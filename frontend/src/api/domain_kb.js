// API calls for Domain Knowledge Base generation

export const sampleData = async (file, frac = 0.1, minRows = 100, stratifyCols = null) => {
  const uri = "http://localhost:8000/domain_kb/sample";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("frac", frac);
  formData.append("min_rows", minRows);
  if (stratifyCols) {
    formData.append("stratify_cols", stratifyCols);
  }

  try {
    const data = await fetch(uri, {
      method: "POST",
      body: formData,
    }).then((res) => res.json());
    return data;
  } catch (error) {
    console.error("Error sampling data:", error);
    throw error;
  }
};

export const generateRules = async (fileOrFormData) => {
  const uri = "http://localhost:8000/domain_kb/generate_rules";
  try {
    const data = await fetch(uri, {
      method: "POST",
      body: fileOrFormData, // FormData with CSV file
    }).then((res) => res.json());
    return data;
  } catch (error) {
    console.error("Error generating rules:", error);
    throw error;
  }
};

export const saveRules = async (rules, dataset) => {
  const uri = "http://localhost:8000/domain_kb/save_rules";
  const formData = new FormData();
  formData.append("rules", JSON.stringify(rules));
  formData.append("dataset", dataset);

  try {
    const data = await fetch(uri, {
      method: "POST",
      body: formData,
    }).then((res) => res.json());
    return data;
  } catch (error) {
    console.error("Error saving rules:", error);
    throw error;
  }
};
