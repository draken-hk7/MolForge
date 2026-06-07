"""Small UniProt, RCSB PDB, and PubChem REST client."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

try:
    import requests
except Exception:
    requests = None


KNOWN_PDB_IDS = {
    "P69905": "1HHO",
    "P00533": "1IVO",
    "P04637": "2OCJ",
    "P68871": "1HHO",
    "P01308": "3I40",
    "P62988": "1UBQ",
    "P00441": "2SOD",
    "P02769": "1AO6",
}


class UniProtClient:
    """Retrieve protein records and known experimental structures."""

    def __init__(self) -> None:
        """Initialize the REST client."""
        self.available = requests is not None
        self.session = requests.Session() if requests is not None else None
        self._pdb_cache: dict[str, str] = {}
        if self.session is not None:
            self.session.headers.update({"User-Agent": "MolForge/1.0 protein module"})

    def search(self, query: str, max_results: int = 10) -> list[dict[str, Any]]:
        """Search UniProtKB."""
        if not self.available or not str(query).strip():
            return []
        payload = self._get_json(
            "https://rest.uniprot.org/uniprotkb/search",
            params={"query": query, "format": "json", "size": min(max(1, max_results), 25)},
        )
        return [self._search_record(item) for item in payload.get("results", []) if isinstance(item, dict)] if payload else []

    def get_by_id(self, uniprot_id: str) -> dict[str, Any]:
        """Fetch one full UniProtKB record."""
        payload = self._get_json(f"https://rest.uniprot.org/uniprotkb/{quote(uniprot_id.strip())}.json")
        if not payload:
            raise ValueError("UniProt record was not found.")
        comments = payload.get("comments", [])
        cross_references = payload.get("uniProtKBCrossReferences", [])
        known_structures = [row.get("id") for row in cross_references if row.get("database") == "PDB" and row.get("id")]
        known_ligands = self._known_ligands(comments)
        return {
            **self._search_record(payload),
            "sequence": payload.get("sequence", {}).get("value", ""),
            "function_description": self._comment_text(comments, "FUNCTION"),
            "subcellular_location": self._locations(comments),
            "disease_associations": self._diseases(comments),
            "known_structures": known_structures,
            "known_ligands": known_ligands,
        }

    def get_sequence(self, uniprot_id: str) -> str:
        """Fetch and parse a UniProt FASTA sequence."""
        if not self.available or self.session is None:
            raise RuntimeError("UniProt requests are unavailable.")
        response = self.session.get(f"https://rest.uniprot.org/uniprotkb/{quote(uniprot_id.strip())}.fasta", timeout=12)
        response.raise_for_status()
        return "".join(line.strip() for line in response.text.splitlines() if line and not line.startswith(">"))

    def find_pdb_ids(self, uniprot_id: str) -> list[str]:
        """Return experimental PDB identifiers for a UniProt accession."""
        accession = str(uniprot_id or "").strip().upper()
        if not accession:
            return []
        ids: list[str] = []
        if accession in KNOWN_PDB_IDS:
            ids.append(KNOWN_PDB_IDS[accession])
        legacy = self._get_json(f"https://www.ebi.ac.uk/proteins/api/proteins/{quote(accession)}")
        current = self._get_json(f"https://rest.uniprot.org/uniprotkb/{quote(accession)}.json")
        for payload in (legacy, current):
            if not payload:
                continue
            references = payload.get("dbReferences", []) + payload.get("uniProtKBCrossReferences", [])
            ids.extend(
                row.get("id", "").upper()
                for row in references
                if row.get("database") == "PDB" and row.get("id")
            )
        return list(dict.fromkeys(ids))

    def get_rcsb_structure(self, pdb_id: str) -> str:
        """Download and cache an experimental PDB structure from RCSB."""
        if not self.available or self.session is None:
            raise RuntimeError("RCSB requests are unavailable.")
        normalized = str(pdb_id or "").strip().upper()
        if normalized in self._pdb_cache:
            return self._pdb_cache[normalized]
        response = self.session.get(f"https://files.rcsb.org/download/{quote(normalized)}.pdb", timeout=20)
        response.raise_for_status()
        if "ATOM" not in response.text:
            raise ValueError("RCSB did not return a PDB structure.")
        self._pdb_cache[normalized] = response.text
        return response.text

    def get_known_structure(self, pdb_id: str) -> str:
        """Backward-compatible alias for RCSB PDB downloads."""
        return self.get_rcsb_structure(pdb_id)

    def search_pubchem(self, query: str, max_results: int = 8) -> list[dict[str, Any]]:
        """Search PubChem by compound name for ligand-like terms."""
        if not self.available or not str(query).strip():
            return []
        properties = "Title,CanonicalSMILES,IsomericSMILES,MolecularFormula,MolecularWeight"
        payload = self._get_json(
            f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{quote(query.strip())}/property/{properties}/JSON"
        )
        rows = payload.get("PropertyTable", {}).get("Properties", []) if payload else []
        return [
            {
                "cid": row.get("CID"),
                "name": row.get("Title") or query,
                "smiles": row.get("ConnectivitySMILES") or row.get("CanonicalSMILES") or row.get("SMILES"),
                "isomeric_smiles": row.get("SMILES") or row.get("IsomericSMILES"),
                "molecular_formula": row.get("MolecularFormula"),
                "molecular_weight": row.get("MolecularWeight"),
            }
            for row in rows[:max_results]
        ]

    def _get_json(self, url: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
        """Execute a JSON GET request with graceful failure."""
        if not self.available or self.session is None:
            return None
        try:
            response = self.session.get(url, params=params or {}, timeout=12)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

    def _search_record(self, item: dict[str, Any]) -> dict[str, Any]:
        """Normalize a UniProt search record."""
        protein = item.get("proteinDescription", {})
        recommended = protein.get("recommendedName", {}).get("fullName", {}).get("value")
        submitted = protein.get("submissionNames", [{}])
        protein_name = recommended or (submitted[0].get("fullName", {}).get("value") if submitted else None) or item.get("uniProtkbId")
        genes = item.get("genes", [])
        gene_name = genes[0].get("geneName", {}).get("value") if genes else None
        return {
            "uniprot_id": item.get("primaryAccession"),
            "protein_name": protein_name,
            "organism": item.get("organism", {}).get("scientificName"),
            "gene_name": gene_name,
            "sequence_length": item.get("sequence", {}).get("length"),
            "reviewed": item.get("entryType") == "UniProtKB reviewed (Swiss-Prot)",
        }

    def _comment_text(self, comments: list[dict[str, Any]], comment_type: str) -> str:
        """Extract joined comment text for a UniProt comment type."""
        texts: list[str] = []
        for comment in comments:
            if comment.get("commentType") != comment_type:
                continue
            for item in comment.get("texts", []):
                if item.get("value"):
                    texts.append(item["value"])
        return " ".join(texts)

    def _locations(self, comments: list[dict[str, Any]]) -> list[str]:
        """Extract subcellular locations."""
        locations: list[str] = []
        for comment in comments:
            if comment.get("commentType") != "SUBCELLULAR LOCATION":
                continue
            for item in comment.get("subcellularLocations", []):
                value = item.get("location", {}).get("value")
                if value:
                    locations.append(value)
        return sorted(set(locations))

    def _diseases(self, comments: list[dict[str, Any]]) -> list[str]:
        """Extract disease associations."""
        return sorted(
            {
                comment.get("disease", {}).get("diseaseId")
                for comment in comments
                if comment.get("commentType") == "DISEASE" and comment.get("disease", {}).get("diseaseId")
            }
        )

    def _known_ligands(self, comments: list[dict[str, Any]]) -> list[str]:
        """Extract cofactor names as known ligand candidates."""
        ligands: list[str] = []
        for comment in comments:
            if comment.get("commentType") != "COFACTOR":
                continue
            for cofactor in comment.get("cofactors", []):
                name = cofactor.get("name")
                if name:
                    ligands.append(re.sub(r"\s*\[[^\]]+\]\s*", "", name).strip())
        return sorted(set(ligands))
