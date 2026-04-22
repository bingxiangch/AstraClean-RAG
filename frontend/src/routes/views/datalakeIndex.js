import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Stack,
  Button,
  Tab,
  Typography,
  TextField,
  useTheme,
} from "@mui/material";
import { TrophySpin } from "react-loading-indicators";

import {
  getIndexes,
  createIndex,
  updateIndex,
  deleteIndex,
} from "../../api/index";

import { sampleData, generateRules, saveRules } from "../../api/domain_kb";

import CustomSelect from "../../components/CustomSelect";
import FileInput from "../../components/FileInput";

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </Box>
  );
};

const IndexModule = (props) => {
  const theme = useTheme();
  const borderColor = theme.palette.border.main;

  // States
  const [value, setValue] = useState(0);

  const [createIndexState, setCreateIndexState] = useState({
    indexName: "",
    fileName: "No file selected",
    files: [],
    isLoading: false,
  });
  const [updateIndexState, setUpdateIndexState] = useState({
    indexName: "",
    fileName: "No file selected",
    files: [],
    isLoading: false,
  });
  const [deleteIndexState, setDeleteIndexState] = useState({
    indexName: "",
    isLoading: false,
  });

  const [generateRulesState, setGenerateRulesState] = useState({
    fileName: "No file selected",
    files: [],
    isLoading: false,
    step: 0, // 0: upload and generate, 1: edit and save
    rules: [],
    rulesText: "", // For editing rules as JSON string
    datasetName: "",
  });

  // Effects
  useEffect(() => {
    const fetchIndexes = async () => {
      const data = await getIndexes();
      props.setSearchIndexList(data.indexes);
    };
    fetchIndexes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Methods
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const onChangecreateIndexStateName = (value) => {
    setCreateIndexState((s) => ({ ...s, indexName: value }));
  };

  const onSelectupdateIndexStateName = (value) => {
    setUpdateIndexState((s) => ({ ...s, indexName: value }));
  };

  const onSelectdeleteIndexStateName = (value) => {
    setDeleteIndexState((s) => ({ ...s, indexName: value }));
  };

  // Single-file handler for .jsonl
  const onChangeJsonlFile = async (files, type) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const name = file.name || "No file selected";
    const isJsonl =
      name.toLowerCase().endsWith(".jsonl") ||
      file.type === "application/jsonl" ||
      file.type === "application/octet-stream"; // browsers often don't know jsonl mime

    if (!isJsonl) {
      // simple guard; you can replace with a toast/snackbar if you have one
      alert("Please select a .jsonl file");
      return;
    }

    if (type === "create") {
      setCreateIndexState((s) => ({
        ...s,
        fileName: name,
        files: [file],
      }));
    } else if (type === "update") {
      setUpdateIndexState((s) => ({
        ...s,
        fileName: name,
        files: [file],
      }));
    }
  };

  const onCreateIndex = async () => {
    const safeName = createIndexState.indexName.trim().replace(/\s+/g, "_");
    if (!safeName) {
      alert("Please enter an index name");
      return;
    }
    if (createIndexState.files.length === 0) {
      alert("Please select a .jsonl file");
      return;
    }

    setCreateIndexState((s) => ({ ...s, isLoading: true }));
    try {
      await createIndex(safeName, createIndexState.files); // expects array with one file
      const indexData = await getIndexes();
      props.setSearchIndexList(indexData.indexes);
    } finally {
      setCreateIndexState((s) => ({ ...s, isLoading: false }));
    }
  };

  const onUpdateIndex = async () => {
    if (!updateIndexState.indexName) {
      alert("Please select an index to update");
      return;
    }
    if (updateIndexState.files.length === 0) {
      alert("Please select a .jsonl file");
      return;
    }

    setUpdateIndexState((s) => ({ ...s, isLoading: true }));
    try {
      await updateIndex(updateIndexState.indexName, updateIndexState.files); // single file in array
    } finally {
      setUpdateIndexState((s) => ({ ...s, isLoading: false }));
    }
  };

  const onDeleteIndex = async () => {
    if (!deleteIndexState.indexName) {
      alert("Please select an index to delete");
      return;
    }

    setDeleteIndexState((s) => ({ ...s, isLoading: true }));
    try {
      await deleteIndex(deleteIndexState.indexName);
      const indexData = await getIndexes();
      props.setSearchIndexList(indexData.indexes);
      setDeleteIndexState((s) => ({ ...s, indexName: "" }));
    } finally {
      setDeleteIndexState((s) => ({ ...s, isLoading: false }));
    }
  };

  // Domain Knowledge Base Generation
  const onChangeCsvFile = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const name = file.name || "No file selected";
    const isCsv =
      name.toLowerCase().endsWith(".csv") ||
      file.type === "text/csv" ||
      file.type === "application/csv";

    if (!isCsv) {
      alert("Please select a .csv file");
      return;
    }

    setGenerateRulesState((s) => ({
      ...s,
      fileName: name,
      files: [file],
    }));
    alert(`✓ File selected: ${name}`);
  };

  const onGenerateRules = async () => {
    if (generateRulesState.files.length === 0) {
      alert("Please select a CSV file");
      return;
    }

    setGenerateRulesState((s) => ({ ...s, isLoading: true }));
    try {
      // Call generateRules API directly with the CSV file
      const formData = new FormData();
      formData.append("file", generateRulesState.files[0]);
      const result = await generateRules(formData);
      const rulesArray = result.rules || [];
      // Convert to JSONL format (each rule on a separate line)
      const rulesJsonl = rulesArray.map(rule => JSON.stringify(rule)).join('\n');
      setGenerateRulesState((s) => ({
        ...s,
        rules: rulesArray,
        rulesText: rulesJsonl,
        step: 1,
        isLoading: false,
      }));
    } catch (error) {
      console.error(error);
      alert("Failed to generate rules. Check console for details.");
      setGenerateRulesState((s) => ({ ...s, isLoading: false }));
    }
  };

  const onSaveRules = async () => {
    if (!generateRulesState.datasetName) {
      alert("Please enter a dataset name");
      return;
    }

    let rulesToSave = generateRulesState.rules;
    if (generateRulesState.rulesText) {
      try {
        // Parse JSONL format (each line is a JSON object)
        const lines = generateRulesState.rulesText.trim().split('\n').filter(line => line.length > 0);
        rulesToSave = lines.map(line => JSON.parse(line));
      } catch (e) {
        alert("Invalid JSONL format in rules editor. Each line must be valid JSON.");
        return;
      }
    }

    if (rulesToSave.length === 0) {
      alert("No rules to save");
      return;
    }

    setGenerateRulesState((s) => ({ ...s, isLoading: true }));
    try {
      await saveRules(rulesToSave, generateRulesState.datasetName);
      alert("Rules saved successfully!");
      setGenerateRulesState({
        fileName: "No file selected",
        files: [],
        isLoading: false,
        step: 0,
        rules: [],
        rulesText: "",
        datasetName: "",
      });
    } catch (error) {
      console.error(error);
      alert("Failed to save rules. Check console for details.");
      setGenerateRulesState((s) => ({ ...s, isLoading: false }));
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      width="100%"
      border={5}
      borderColor={borderColor}
    >
      <Box sx={{ padding: "16px", borderBottom: `2px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: "8px" }}>
          Data Index Management
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.9rem" }}>
          Upload index files (domain_kb, history_log) or construct domain rules from clean data
        </Typography>
      </Box>

      <Tabs
        value={value}
        onChange={handleChange}
        textColor="primary"
        indicatorColor="primary"
        variant="fullWidth"
      >
        <Tab label="Create" id="tab-0" />
        <Tab label="Update" id="tab-1" />
        <Tab label="Delete" id="tab-2" />
      </Tabs>

      <TabPanel value={value} index={0}>
        <Box
          marginTop={1}
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="flex-start"
          padding={0}
        >
          <Typography variant="caption" sx={{ width: "100%", marginBottom: "12px", color: theme.palette.text.secondary, fontSize: "0.95rem", fontWeight: 300, letterSpacing: "0.5px" }}>
              Create a new data lake index by uploading a .jsonl file containing domain rules or cleaning history logs.
          </Typography>
          
          <Box sx={{ width: "100%", marginBottom: "20px", paddingTop: "12px", borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" sx={{ marginBottom: "8px", color: theme.palette.text.primary, fontWeight: 500 }}>
              Other Operations:
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: "6px", color: theme.palette.text.secondary, fontSize: "0.9rem" }}>
              • <strong>Update:</strong> Merge new .jsonl file data into existing index
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.9rem" }}>
              • <strong>Delete:</strong> Remove an existing data lake index permanently
            </Typography>
          </Box>

          <Stack mt={2} spacing={1.5} width="360px">
            {createIndexState.isLoading ? (
              <TrophySpin
                color="#4caf50"
                style={{ fontSize: "40px" }}
                speedPlus="1"
                text={`Creating ${createIndexState.indexName}`}
              />
            ) : (
              <>
                <TextField
                  label="Index Name"
                  value={createIndexState.indexName}
                  onChange={(e) => onChangecreateIndexStateName(e.target.value)}
                  size="small"
                  fullWidth
                />
                <FileInput
                  type="single"
                  accept=".jsonl"
                  fileName={createIndexState.fileName}
                  onChange={(files) => onChangeJsonlFile(files, "create")}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onCreateIndex}
                  disabled={
                    !createIndexState.indexName ||
                    createIndexState.files.length === 0
                  }
                  size="small"
                  fullWidth
                >
                  Create
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </TabPanel>

      <TabPanel value={value} index={1}>
        <Box
          marginTop={1}
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="flex-start"
          padding={0}
        >
          <Typography variant="caption" sx={{ width: "100%", marginBottom: "12px", color: theme.palette.text.secondary, fontSize: "0.7rem", fontWeight: 300, letterSpacing: "0.5px" }}>
            Update an existing data lake index by uploading new .jsonl file to merge or append data.
          </Typography>
          <Stack mt={2} spacing={1.5} width="360px">
            {updateIndexState.isLoading ? (
              <TrophySpin
                color="#1976d2"
                style={{ fontSize: "40px" }}
                speedPlus="1"
                text={`Updating ${updateIndexState.indexName}`}
              />
            ) : (
              <>
                <CustomSelect
                  label="Select"
                  selection={updateIndexState.indexName}
                  multiple={false}
                  includeGroupNames={false}
                  groupedOptions={[
                    { name: "columns", options: props.searchIndexList },
                  ]}
                  onChange={onSelectupdateIndexStateName}
                />
                <FileInput
                  type="single"
                  accept=".jsonl"
                  fileName={updateIndexState.fileName}
                  onChange={(files) => onChangeJsonlFile(files, "update")}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onUpdateIndex}
                  disabled={
                    !updateIndexState.indexName ||
                    updateIndexState.files.length === 0
                  }
                  size="small"
                  fullWidth
                >
                  Update
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </TabPanel>

      <TabPanel value={value} index={2}>
        <Box
          marginTop={1}
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="flex-start"
          padding={0}
        >
          <Typography variant="caption" sx={{ width: "100%", marginBottom: "12px", color: theme.palette.text.secondary, fontSize: "0.7rem", fontWeight: 300, letterSpacing: "0.5px" }}>
            Delete an existing data lake index. Select the index name to permanently remove all associated data.
          </Typography>

          <Stack mt={2} spacing={1.5} width="360px">
            {deleteIndexState.isLoading ? (
              <TrophySpin
                color="#f44336"
                style={{ fontSize: "40px" }}
                speedPlus="1"
                text={`Deleting ${deleteIndexState.indexName}`}
              />
            ) : (
              <>
                <CustomSelect
                  label="Select"
                  selection={deleteIndexState.indexName}
                  multiple={false}
                  includeGroupNames={false}
                  groupedOptions={[
                    { name: "columns", options: props.searchIndexList },
                  ]}
                  onChange={onSelectdeleteIndexStateName}
                />
                <Button
                  variant="contained"
                  color="error"
                  onClick={onDeleteIndex}
                  disabled={!deleteIndexState.indexName}
                  size="small"
                  fullWidth
                >
                  Delete
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </TabPanel>

      {/* Domain Knowledge Construction - Below all tabs */}
      <Box
        marginTop={4}
        marginBottom={2}
        padding={2}
        border={2}
        borderColor={borderColor}
        borderRadius="8px"
      >
        <Box sx={{ marginBottom: "12px" }}>
          <Typography variant="body2" sx={{ fontWeight: "bold", marginBottom: "4px" }}>
            Construct Domain Knowledge (JSONL)
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: "0.85rem", lineHeight: "1.4" }}>
            Generate domain rules from clean data using LLM, then save as .jsonl format for integration into data lake index
          </Typography>
        </Box>

        <Box display="flex" gap={2} alignItems="flex-start">
          {/* Left section - File upload and controls */}
          <Box flex={0.5} minWidth="250px">
            {generateRulesState.isLoading ? (
              <Box display="flex" justifyContent="center">
                <TrophySpin
                  color="#ff9800"
                  style={{ fontSize: "40px" }}
                  speedPlus="1"
                  text="Generating Rules..."
                />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" sx={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                    Upload CSV
                  </Typography>
                  <FileInput
                    type="single"
                    accept=".csv"
                    fileName={generateRulesState.fileName}
                    onChange={onChangeCsvFile}
                  />
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={onGenerateRules}
                  disabled={generateRulesState.files.length === 0}
                  fullWidth
                >
                  Generate Rules
                </Button>

                {generateRulesState.step === 1 && (
                  <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, paddingTop: "16px" }}>
                    <Stack spacing={2}>
                      <TextField
                        label="Dataset Name"
                        value={generateRulesState.datasetName}
                        onChange={(e) =>
                          setGenerateRulesState((s) => ({
                            ...s,
                            datasetName: e.target.value,
                          }))
                        }
                        placeholder="e.g., domain_kb_beer"
                        size="small"
                        fullWidth
                      />
                      <Button
                        variant="contained"
                        color="success"
                        onClick={onSaveRules}
                        disabled={!generateRulesState.datasetName}
                        fullWidth
                      >
                        Save Rules as JSONL
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setGenerateRulesState((s) => ({
                            ...s,
                            step: 0,
                          }))
                        }
                        fullWidth
                      >
                        Back to Upload
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
          </Box>

          {/* Right section - Editable Rules Display */}
          <Box flex={1.5}>
            {generateRulesState.step === 1 && (
              <Box>
                <Typography variant="body2" sx={{ marginBottom: "8px", fontWeight: "bold" }}>
                  Generated Rules - JSONL Format:(Edit as needed before saving)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  value={generateRulesState.rulesText}
                  onChange={(e) =>
                    setGenerateRulesState((s) => ({
                      ...s,
                      rulesText: e.target.value,
                    }))
                  }
                  variant="outlined"
                  sx={{
                    marginTop: "8px",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    backgroundColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5',
                    "& .MuiOutlinedInput-root": {
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default IndexModule;



// import React, { useEffect, useState } from "react";
// import {
//   Box,
//   Tabs,
//   Stack,
//   Button,
//   Tab,
//   Typography,
//   TextField,
//   useTheme,
// } from "@mui/material";
// import { TrophySpin } from "react-loading-indicators";

// import {
//   getIndexes,
//   createIndex,
//   updateIndex,
//   deleteIndex,
// } from "../../api/index";

// import CustomSelect from "../../components/CustomSelect";
// import FileInput from "../../components/FileInput";

// const TabPanel = (props) => {
//   const { children, value, index, ...other } = props;

//   return (
//     <Box
//       role="tabpanel"
//       hidden={value !== index}
//       id={`tabpanel-${index}`}
//       aria-labelledby={`tab-${index}`}
//       {...other}
//     >
//       {value === index && <Box>{children}</Box>}
//     </Box>
//   );
// };

// const IndexModule = (props) => {
//   const theme = useTheme();
//   const borderColor = theme.palette.border.main;

//   // States
//   const [value, setValue] = useState(0);

//   const [createIndexState, setCreateIndexState] = useState({
//     indexName: "",
//     fileName: "No file selected",
//     files: [],
//     isLoading: false,
//   });
//   const [updateIndexState, setUpdateIndexState] = useState({
//     indexName: "",
//     fileName: "No file selected",
//     files: [],
//     isLoading: false,
//   });
//   const [deleteIndexState, setDeleteIndexState] = useState({
//     indexName: "",
//     isLoading: false,
//   });

//   // Effects
//   useEffect(() => {
//     const fetchIndexes = async () => {
//       const data = await getIndexes();
//       props.setSearchIndexList(data.indexes);
//     };
//     fetchIndexes();
//   }, []);

//   // Methods
//   const handleChange = (event, newValue) => {
//     setValue(newValue);
//   };

//   const onChangecreateIndexStateName = (value) => {
//     setCreateIndexState({
//       ...createIndexState,
//       indexName: value,
//     });
//   };

//   const onSelectupdateIndexStateName = (value) => {
//     setUpdateIndexState({
//       ...updateIndexState,
//       indexName: value,
//     });
//   };

//   const onSelectdeleteIndexStateName = (value) => {
//     setDeleteIndexState({
//       ...deleteIndexState,
//       indexName: value,
//     });
//   };

//   const onChangeDataLakeFile = async (files, type) => {
//     if (files.length === 0) return;

//     const fullPath = files[0].webkitRelativePath;
//     const fileName = fullPath.substring(0, fullPath.lastIndexOf("/"));

//     let fileList = [];
//     for (const file of files) {
//       if (file.type === "text/csv") fileList.push(file);
//     }

//     if (type === "create") {
//       setCreateIndexState({
//         ...createIndexState,
//         fileName: fileName,
//         files: fileList,
//       });
//     } else if (type === "update") {
//       setUpdateIndexState({
//         ...updateIndexState,
//         fileName: fileName,
//         files: fileList,
//       });
//     }
//   };

//   const onCreateIndex = async () => {
//     setCreateIndexState({ ...createIndexState, isLoading: true });
//     const indexName = createIndexState.indexName.trim().replace(/\s+/g, "_");
//     await createIndex(indexName, createIndexState.files);
//     const indexData = await getIndexes();
//     props.setSearchIndexList(indexData.indexes);
//     setCreateIndexState({ ...createIndexState, isLoading: false });
//   };

//   const onUpdateIndex = async () => {
//     setUpdateIndexState({ ...updateIndexState, isLoading: true });
//     await updateIndex(updateIndexState.indexName, updateIndexState.files);
//     setUpdateIndexState({ ...updateIndexState, isLoading: false });
//   };

//   const onDeleteIndex = async () => {
//     setDeleteIndexState({ ...deleteIndexState, isLoading: true });
//     await deleteIndex(deleteIndexState.indexName);
//     const indexData = await getIndexes();
//     props.setSearchIndexList(indexData.indexes);
//     setDeleteIndexState({
//       ...deleteIndexState,
//       indexName: "",
//       isLoading: false,
//     });
//   };

//   return (
//     <Box
//       display="flex"
//       flexDirection="column"
//       height="100%"
//       width="100%"
//       border={5}
//       borderColor={borderColor}
//     >
//       <Tabs
//         value={value}
//         onChange={handleChange}
//         textColor="primary"
//         indicatorColor="primary"
//         variant="fullWidth"
//       >
//         <Tab label="Create" id="tab-0" />
//         <Tab label="Update" id="tab-1" />
//         <Tab label="Delete" id="tab-2" />
//       </Tabs>

//       <TabPanel value={value} index={0}>
//         <Box
//           marginTop={3}
//           display="flex"
//           flexDirection="column"
//           alignItems="center"
//           justifyContent="center"
//         >
//           <Typography variant="h5" sx={{ width: "60%" }}>
//             Create a new data lake index by uploading a folder of CSV files.
//             Provide a unique name for your index. The uploaded data will be
//             indexed under this name for easy retrieval and management.
//           </Typography>
//           <Stack mt={10} spacing={2} width="38%">
//             {createIndexState.isLoading ? (
//               <TrophySpin
//                 color="#4caf50"
//                 style={{ fontSize: "40px" }}
//                 speedPlus="1"
//                 text={`Creating ${createIndexState.indexName}`}
//               />
//             ) : (
//               <>
//                 <TextField
//                   label="Index Name"
//                   value={createIndexState.indexName}
//                   onChange={(e) => onChangecreateIndexStateName(e.target.value)}
//                 />
//                 <FileInput
//                   type="multiple"
//                   fileName={createIndexState.fileName}
//                   onChange={(e) => onChangeDataLakeFile(e, "create")}
//                 />
//                 <Button
//                   variant="contained"
//                   color="primary"
//                   onClick={onCreateIndex}
//                 >
//                   Create
//                 </Button>
//               </>
//             )}
//           </Stack>
//         </Box>
//       </TabPanel>
//       <TabPanel value={value} index={1}>
//         <Box
//           marginTop={3}
//           display="flex"
//           flexDirection="column"
//           alignItems="center"
//           justifyContent="center"
//         >
//           <Typography variant="h5" sx={{ width: "60%" }}>
//             Update an existing data lake index by selecting the index name.
//             Upload a new folder of CSV files to add to the selected index. The
//             new data will be indexed and merged with the selected index.
//           </Typography>
//           <Stack mt={10} spacing={2} width="38%">
//             {updateIndexState.isLoading ? (
//               <TrophySpin
//                 color="#1976d2"
//                 style={{ fontSize: "40px" }}
//                 speedPlus="1"
//                 text={`Updating ${updateIndexState.indexName}`}
//               />
//             ) : (
//               <>
//                 <CustomSelect
//                   label="Select"
//                   selection={updateIndexState.indexName}
//                   multiple={false}
//                   includeGroupNames={false}
//                   groupedOptions={[
//                     { name: "columns", options: props.searchIndexList },
//                   ]}
//                   onChange={onSelectupdateIndexStateName}
//                 />
//                 <FileInput
//                   type="multiple"
//                   fileName={updateIndexState.fileName}
//                   onChange={(e) => onChangeDataLakeFile(e, "update")}
//                 />
//                 <Button
//                   variant="contained"
//                   color="primary"
//                   onClick={onUpdateIndex}
//                 >
//                   Update
//                 </Button>
//               </>
//             )}
//           </Stack>
//         </Box>
//       </TabPanel>
//       <TabPanel value={value} index={2}>
//         <Box
//           marginTop={3}
//           display="flex"
//           flexDirection="column"
//           alignItems="center"
//           justifyContent="center"
//         >
//           <Typography variant="h5" sx={{ width: "60%" }}>
//             Delete an existing data lake index by selecting the index name from
//             the dropdown menu. This action will permanently remove the selected
//             index and all its associated data from the system.
//           </Typography>

//           <Stack mt={10} spacing={2} width="38%">
//             {deleteIndexState.isLoading ? (
//               <TrophySpin
//                 color="#f44336"
//                 style={{ fontSize: "40px" }}
//                 speedPlus="1"
//                 text={`Deleting ${deleteIndexState.indexName}`}
//               />
//             ) : (
//               <>
//                 <CustomSelect
//                   label="Select"
//                   selection={deleteIndexState.indexName}
//                   multiple={false}
//                   includeGroupNames={false}
//                   groupedOptions={[
//                     { name: "columns", options: props.searchIndexList },
//                   ]}
//                   onChange={onSelectdeleteIndexStateName}
//                 />
//                 <Button
//                   variant="contained"
//                   color="error"
//                   onClick={onDeleteIndex}
//                 >
//                   Delete
//                 </Button>
//               </>
//             )}
//           </Stack>
//         </Box>
//       </TabPanel>
//     </Box>
//   );
// };

// export default IndexModule;
