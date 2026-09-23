import { apiGet, apiPost, apiDelete, apiUpload, pickList, API_BASE_URL } from "./api";

export function getDocuments() {
  return apiGet("/documents");
}

/**
 * The API has no GET /documents/:id, so fetch the list and find by id.
 * Returns { data: doc|null } so callers can show "Data not found" cleanly.
 */
export async function getDocumentById(id) {
  const res = await apiGet("/documents");
  const { items } = pickList(res);
  const doc = items.find((d) => String(d.id) === String(id)) ?? null;
  return { data: doc };
}

/**
 * Upload a document. Accepts a File plus metadata fields; builds a multipart
 * FormData so the backend receives the binary alongside the metadata.
 * Field names are PascalCase to match the backend's multipart schema.
 */
/** Direct-navigable URL for GET /documents/:code/download — the browser handles the save. */
export function getDocumentDownloadUrl(id) {
  return `${API_BASE_URL}/documents/${encodeURIComponent(id)}/download`;
}

export function uploadDocument({ file, ...fields }) {
  const formData = new FormData();
  if (file) formData.append("File", file);
  const map = {
    uploadPath: "UploadPath",
    matrixId: "MatrixId",
    type: "Type",
    displayName: "DisplayName",
    accessLevel: "AccessLevel",
    notes: "Notes",
  };
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(map[key] || key, value);
  });
  return apiUpload("/documents", formData);
}

// Unclassified uploads: files attached to a matrix that haven't been given a
// document type/classification yet. They get promoted into the main
// Documents & Metadata list once classified.
export function getUnclassifiedUploads(matrixId) {
  return apiGet(matrixId ? `/unclassified-uploads?matrixId=${encodeURIComponent(matrixId)}` : "/unclassified-uploads");
}

export function addUnclassifiedUpload({ file, matrixId }) {
  const formData = new FormData();
  if (file) formData.append("File", file);
  formData.append("MatrixId", matrixId || "");
  return apiUpload("/unclassified-uploads", formData);
}

export function promoteUnclassifiedUpload(id, type) {
  return apiPost(`/unclassified-uploads/${id}/promote`, { type });
}

export function deleteUnclassifiedUpload(id) {
  return apiDelete(`/unclassified-uploads/${id}`);
}
