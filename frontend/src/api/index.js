export const getIndexes = async () => {
  const uri = "http://localhost:8000/index";
  try {
    const data = await fetch(uri).then((res) => res.json());
    return data;
  } catch (error) {
    console.error("Error getting indexes:", error);
    throw error;
  }
};
// api/index.js
export const createIndex = async (indexName, files) => {
  const uri = "http://localhost:8000/index/"; // match FastAPI route

  // Normalize to an array of File
  let fileArray;
  if (files instanceof File) fileArray = [files];
  else if (files instanceof FileList) fileArray = Array.from(files);
  else if (Array.isArray(files)) fileArray = files;
  else throw new Error("createIndex: second arg must be File | FileList | File[]");

  const formData = new FormData();
  formData.append("index_name", indexName);
  fileArray.forEach((f) => formData.append("files", f)); // <-- plural key

  const res = await fetch(uri, { method: "POST", body: formData });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }
  return res.json();
};


// export const createIndex = async (indexName, files) => {
//   const uri = "http://localhost:8000/index";
//   let formData = new FormData();
//   try {
//     formData.append("index_name", indexName);
//     files.forEach((file) => {
//       formData.append("files", file);
//     });

//     const data = await fetch(uri, {
//       method: "POST",
//       body: formData,
//     }).then((res) => res.json());
//     return data;
//   } catch (error) {
//     console.error("Error posting index:", error);
//     throw error;
//   }
// };

export const updateIndex = async (indexName, files) => {
  const uri = "http://localhost:8000/index";
  let formData = new FormData();
  try {
    formData.append("index_name", indexName);
    files.forEach((file) => {
      formData.append("files", file);
    });

    const data = await fetch(uri, {
      method: "PUT",
      body: formData,
    }).then((res) => res.json());
    return data;
  } catch (error) {
    console.error("Error updating index:", error);
    throw error;
  }
};

export const deleteIndex = async (indexName) => {
  const uri = `http://localhost:8000/index/${indexName}`;
  try {
    const data = await fetch(uri, {
      method: "DELETE",
    }).then((res) => res.json());
    return data;
  } catch (error) {
    console.error("Error deleting index:", error);
    throw error;
  }
};


/**
 * Upsert repaired rows directly into a Qdrant index
 * @param {string} indexName - Name of the index
 * @param {Array} rows - Array of row objects to upsert
 */
export const upsertRows = async (indexName, rows) => {
  const uri = "http://localhost:8000/index/upsert_rows"; // match your FastAPI route

  try {
    const res = await fetch(uri, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index_name: indexName, rows }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error upserting rows:", error);
    throw error;
  }
};