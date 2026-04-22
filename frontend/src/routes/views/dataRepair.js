import React, { useEffect, useState } from "react";
import { Box, useTheme } from "@mui/material";
import { Mosaic } from "react-loading-indicators";

import { parseData, cleanData, prepareData } from "../../utilities/data";

import { getRepairs } from "../../api/repair";
import { getModels } from "../../api/model";
import { getIndexes } from "../../api/index";
import { upsertRows } from "../../api/index"; // adjust path

import Panel from "../../components/Panel";
import DataTable from "../../components/DataTable";
import Evidence from "../../components/Evidence";
import DragDropFile from "../../components/DragDrop";
const RepairModule = (props) => {
  const theme = useTheme();
  const borderColor = theme.palette.border.main;
  const repairOptionDefaultStrings = { Any: "*", Null: "NULL", Custom: "" };

  const resultColumn = "AstraClean-RAG Results";

  // States
  const [reasonersList, setReasonersList] = useState([]);

  const [dirtyData, setDirtyData] = useState({
    fileName: "No file selected",
    content: null,
    columns: [],
    rows: new Set(),
  });

  const [entityDescription, setEntityDescription] = useState("");

  const [configuration, setConfiguration] = useState({
    dirtyColumn: "",
    repairOptionState: { Any: true, Null: false, Custom: false },
    repairString: "*",
    pivotColumns: new Set(),
    reasonerName: "",
    searchIndexName: "",
    indexState: { Semantic: true, Syntactic: false },
  });

  const [result, setResult] = useState({
    data: {}, // Changed from [] to {}
    marked: new Set(),
    isLoading: false,
  });

  const [evidence, setEvidence] = useState({
    sourceTuple: null,
    sourceTableName: null,
    sourceRowNumber: null,
    dirtyValue: null,
    cleanValue: null,
    conflicSummary: null,
    hasConflict: false,
    conflictData: null,
  });

  // Effects
  useEffect(() => {
    const fetchModels = async () => {
      const model_data = await getModels();
      setReasonersList(model_data.models);
    };
    fetchModels();
    const fetchIndexes = async () => {
      const indexData = await getIndexes();
      props.setSearchIndexList(indexData.indexes);
    };
    fetchIndexes();
  }, []);

  useEffect(() => {
    const selectedColumn = configuration.dirtyColumn;
    const regexString = configuration.repairString;
    if (selectedColumn === "") return;

    const regex =
      regexString === ""
        ? /^$/
        : regexString === "*"
        ? /[\s\S]*/
        : new RegExp(regexString);

    const filteredRows = new Set(
      dirtyData.content
        .map((obj, index) => (regex.test(obj[selectedColumn]) ? index : -1))
        .filter((index) => index !== -1)
    );
    setDirtyData({
      ...dirtyData,
      rows: filteredRows,
    });
  }, [
    dirtyData.content,
    configuration.dirtyColumn,
    configuration.repairString,
  ]);

  // Pre-repair Methods
  const onChangeDirtyDataFile = async (files) => {
    if (files.length === 0) return;

    setConfiguration({
      ...configuration,
      dirtyColumn: "",
      repairOptionState: { Any: true, Null: false, Custom: false },
      repairString: "*",
      pivotColumns: new Set(),
    });
    setResult({ data: {}, marked: new Set(), isLoading: false });
    setEvidence({
      sourceTuple: null,
      sourceTableName: null,
      sourceRowNumber: null,
      dirtyValue: null,
      cleanValue: null,
      conflicSummary: null,
      hasConflict: false,
      conflictData: null,
    });

    const file = files[0];
    let content = await parseData(file);
    content = cleanData(content);
    const rows = new Set(content.cleanObjArr.map((_, index) => index));
    setDirtyData({
      ...dirtyData,
      fileName: file.name,
      content: content.cleanObjArr,
      columns: content.columns,
      rows: rows,
    });
  };

  const onChangeEntityDescription = (value) => setEntityDescription(value);

  const onSelectDirtyColumn = (value) => {
    setConfiguration({ ...configuration, dirtyColumn: value });
  };

  const onChangeRepairOption = (value) => {
    let repairOptionState = { Any: false, Null: false, Custom: false };
    repairOptionState[value] = true;
    setConfiguration({
      ...configuration,
      repairOptionState: repairOptionState,
      repairString: value === "Any" ? "*" : value === "Null" ? "NULL" : "",
    });
  };

  const onChangeRepairString = (value) => {
    setConfiguration({
      ...configuration,
      repairString: value,
    });
  };

  const onSelectPivotColumns = (value) => {
    value = new Set(value);
    setConfiguration({
      ...configuration,
      pivotColumns: value,
    });
  };

  const onSelectReasonerName = (value) => {
    setConfiguration({
      ...configuration,
      reasonerName: value,
    });
  };

  const onSelectSearchIndexName = (value) => {
    setConfiguration({
      ...configuration,
      searchIndexName: value,
    });
  };

  const onChangeIndexType = (value) => {
    let indexState = { ...configuration.indexState };
    indexState[value] = !indexState[value];
    const allFalse = Object.values(indexState).every(
      (value) => value === false
    );
    if (allFalse) indexState[value] = true;
    setConfiguration({
      ...configuration,
      indexState: indexState,
    });
  };




const onRunJob = async () => {
  setResult({ ...result, isLoading: true });

  const { dirtyColumData, pivotColumData } = prepareData(
    dirtyData.content,
    dirtyData.rows,
    configuration.dirtyColumn,
    configuration.pivotColumns
  );

  // Ensure searchIndexName is always an array
  const selectedIndices = Array.isArray(configuration.searchIndexName)
    ? configuration.searchIndexName
    : configuration.searchIndexName
    ? [configuration.searchIndexName]
    : [];

  if (selectedIndices.length === 0) {
    alert("Please select at least one search index");
    setResult({ ...result, isLoading: false });
    return;
  }

  let indexType = null;
  if (selectedIndices.length > 0) {
    if (
      configuration.indexState["Syntactic"] &&
      configuration.indexState["Semantic"]
    ) {
      indexType = "both";
    } else if (configuration.indexState["Semantic"]) {
      indexType = "semantic";
    } else if (configuration.indexState["Syntactic"]) {
      indexType = "syntactic";
    }
  }

  const requestObj = {
    entity_description: entityDescription !== "" ? entityDescription : null,
    target_name: configuration.dirtyColumn,
    target_data: dirtyColumData,
    pivot_names: Array.from(configuration.pivotColumns),
    pivot_data: pivotColumData,
    reasoner_name: configuration.reasonerName,
    index_name: selectedIndices,
    index_type: indexType,
  };

  try {
    const response = await getRepairs(requestObj);
    console.log("=== REPAIR RESPONSE ===");
    console.log("Full response:", response);
    console.log("Response status:", response?.status);
    const repairs = response?.results ?? [];
    console.log("Repairs array:", repairs);
    console.log("Repairs length:", repairs.length);

    if (!Array.isArray(repairs) || repairs.length === 0) {
      alert("No repair results returned from the server");
      setResult({ ...result, isLoading: false });
      return;
    }

    let marked = new Set();
    let content = [...dirtyData.content];
    let data = {}; // Change to object
    let j = 0;

    console.log("=== BUILD DATA ARRAY LOOP ===");
    console.log("dirtyData.rows:", dirtyData.rows);
    console.log("dirtyData.rows.size:", dirtyData.rows.size);
    console.log("dirtyData.content.length:", dirtyData.content.length);
    console.log("repairs.length:", repairs.length);

    for (let i = 0; i < dirtyData.content.length; i++) {
      let rowObj = content[i];
      if (dirtyData.rows.has(i)) {
        const repairValue = repairs[j]?.value ?? null;
        rowObj[resultColumn] = repairValue;
        data[i] = repairs[j] ?? null; // Use object with row index as key
        if (repairValue !== null) marked.add(i);
        j++;
      } else {
        rowObj[resultColumn] = null;
        data[i] = null; // Use object with row index as key
      }
      content[i] = rowObj;
    }

    console.log("=== FINAL DATA ARRAY ===");
    console.log("data object:", data);
    console.log("data keys:", Object.keys(data).length);
    console.log("marked:", marked);
    console.log("Number of rows with repair data:", Array.from(marked).length);

    setResult({
      ...result,
      data: data,
      marked: marked,
      isLoading: false,
    });

    setEvidence({
      sourceTuple: null,
      sourceTableName: null,
      sourceRowNumber: null,
      dirtyValue: null,
      cleanValue: null,
      conflicSummary: null,
      hasConflict: false,
      conflictData: null,
    });

    setDirtyData({ ...dirtyData, content: content });
  } catch (err) {
    console.error(err);
    alert("Error running repair job. Check console for details.");
    setResult({ ...result, isLoading: false });
  }
};




  const onMarkResult = (index) => {
    let marked = new Set([...result.marked]);
    marked.has(index) ? marked.delete(index) : marked.add(index);
    setResult({ ...result, marked });
  };

  const onShowEvidence = (index) => {
    console.log("=== onShowEvidence called ===");
    console.log("index:", index);
    console.log("result.data:", result.data);
    const dataObj = result.data[index];
    console.log("dataObj at index", index, ":", dataObj);
    
    // Handle case where there's no repair result for this row
    if (!dataObj) {
      console.warn("No repair result available for row index:", index);
      setEvidence({
        sourceTuple: null,
        sourceTableName: null,
        sourceRowNumber: null,
        dirtyValue: null,
        cleanValue: null,
        conflicSummary: null,
        hasConflict: false,
        conflictData: null,
      });
      return;
    }
    
    console.log("dataObj.citation:", dataObj.citation);
    // Handle case where there's no citation data
    if (!dataObj.citation) {
      console.warn("No citation data available for row index:", index);
      setEvidence({
        sourceTuple: null,
        sourceTableName: dataObj.table_name,
        sourceRowNumber: dataObj.row_number,
        dirtyValue: null,
        cleanValue: dataObj.value,
        conflicSummary: null,
        hasConflict: false,
        conflictData: null,
      });
      return;
    }
    
    const sourceTuple = dataObj.citation;
    const sourceTableName = dataObj.table_name;
    const sourceRowNumber = dataObj.row_number;
    const cleanValue = dataObj.value;
    
    // Get conflict info from repair result - new LLM-based mediation format
    let conflicSummary = null;
    let hasConflict = false;
    let conflictData = null;
    if (dataObj.conflict) {
      hasConflict = dataObj.conflict.has_conflict;
      conflicSummary = dataObj.conflict.summary;
      // Extract the full conflict data with LLM mediation results
      conflictData = {
        mode: dataObj.conflict.mode || "aligned",
        decision: dataObj.conflict.summary,
        reasoning: dataObj.conflict.reasoning || "",
        sources: dataObj.conflict.sources || {},
        severity: dataObj.conflict.severity || "none",
        confidence: dataObj.conflict.confidence || 0.5
      };
    }
    
    // Get dirty value from the content
    const dirtyValue = dirtyData.content[index]?.[configuration.dirtyColumn] ?? null;
    
    console.log("Setting evidence with sourceTuple:", sourceTuple, "conflict:", dataObj.conflict);
    setEvidence({
      sourceTuple: sourceTuple,
      sourceTableName: sourceTableName,
      sourceRowNumber: sourceRowNumber,
      dirtyValue: dirtyValue,
      cleanValue: cleanValue,
      conflicSummary: conflicSummary,
      hasConflict: hasConflict,
      conflictData: conflictData,
    });
  };



  const onApplyRepairs = async () => {  // <-- add async here
    if (Object.keys(result.data).length === 0) return;

    const content = [...dirtyData.content];
    const repairedRows = [];

    for (const index of result.marked) {
      const rowObj = { ...content[index] };
      const oldValue = rowObj[configuration.dirtyColumn]; // optional: old dirty value

      rowObj[configuration.dirtyColumn] = rowObj[resultColumn];
      delete rowObj[resultColumn];

      content[index] = rowObj;

      repairedRows.push({
        table: rowObj.table ?? configuration.tableName,
        column: configuration.dirtyColumn,
        dirty_value: oldValue,
        clean_value: rowObj[configuration.dirtyColumn],
        timestamp: new Date().toISOString(),      // current timestamp
      });
    }

    setResult({ ...result, data: {}, marked: new Set() });
    setEvidence({ sourceTuple: null, sourceTableName: null, sourceRowNumber: null, dirtyValue: null, cleanValue: null, conflicSummary: null, hasConflict: false });
    setDirtyData({ ...dirtyData, content });
    if (repairedRows.length > 0) {
      try {
        // 1. Remove extension
        const baseName = dirtyData.fileName.replace(/\.[^/.]+$/, ""); // "audible_dirty"

        // 2. Remove suffix "_dirty" if exists
        const tableName = baseName.replace(/_dirty$/, ""); // "audible"

        // 3. Build index name
        const indexName = `history_log_${tableName}`; // "history_log_audible"
        // const indexName = 'history_log';
        const json = await upsertRows(indexName, repairedRows);
        console.log("Upsert success:", json);
      } catch (err) {
        console.error("Failed to upsert rows:", err);
      }
    }
  };


  const onCancelRepairs = () => {
    setResult({ ...result, data: {}, marked: new Set() });
    setEvidence({
      sourceTuple: null,
      sourceTableName: null,
      sourceRowNumber: null,
      dirtyValue: null,
      cleanValue: null,
      conflicSummary: null,
      hasConflict: false,
      conflictData: null,
    });
  };

  return (
    <Box
      height="100%"
      width="100%"
      display="flex"
      border={5}
      borderColor={borderColor}
    >
      <Box
        id="left"
        height="100%"
        width="20%"
        borderRight={5}
        borderColor={borderColor}
      >
        <Panel
          dirtyDataFileName={dirtyData.fileName}
          onChangeDirtyDataFile={onChangeDirtyDataFile}
          isDirtyDataUploaded={dirtyData.content !== null}
          entityDescription={entityDescription}
          onChangeEntityDescription={onChangeEntityDescription}
          columns={dirtyData.columns}
          dirtyColumn={configuration.dirtyColumn}
          onSelectDirtyColumn={onSelectDirtyColumn}
          repairOptionState={configuration.repairOptionState}
          onChangeRepairOption={onChangeRepairOption}
          isRepairOptionCustom={configuration.repairOptionState["Custom"]}
          repairString={configuration.repairString}
          onChangeRepairString={onChangeRepairString}
          repairOptionDefaultStrings={repairOptionDefaultStrings}
          pivotColumns={configuration.pivotColumns}
          onSelectPivotColumns={onSelectPivotColumns}
          reasonerName={configuration.reasonerName}
          reasonerNames={reasonersList}
          onSelectReasonerName={onSelectReasonerName}
          searchIndexName={configuration.searchIndexName}
          searchIndexNames={props.searchIndexList}
          onSelectSearchIndexName={onSelectSearchIndexName}
          indexState={configuration.indexState}
          onChangeIndexType={onChangeIndexType}
          isLoading={result.isLoading}
          onRunJob={onRunJob}
        />
      </Box>
      <Box height="100%" width="80%">
        {dirtyData.content === null ? (
          <Box height="100%" padding="2%">
            <DragDropFile onChange={onChangeDirtyDataFile} />
          </Box>
        ) : result.isLoading ? (
          <Box
            height="100%"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Mosaic
              color={["#33CCCC", "#33CC36", "#B8CC33", "#FCCA00"]}
              style={{ fontSize: "80px" }}
              text="Repairing"
            />
          </Box>
        ) : (
          <Box height="100%">
            <Box id="rightTop" height="80%">
              <DataTable
                dirtyDataContent={dirtyData.content}
                columns={
                  Object.keys(result.data).length === 0
                    ? dirtyData.columns
                    : [...dirtyData.columns, resultColumn]
                }
                isDirtyDataUploaded={dirtyData.content !== null}
                dirtyColumn={configuration.dirtyColumn}
                pivotColumns={configuration.pivotColumns}
                isIndexSelected={configuration.searchIndexName !== ""}
                resultColumn={resultColumn}
                result={result}
                onMarkResult={onMarkResult}
                onShowEvidence={onShowEvidence}
                onApplyRepairs={onApplyRepairs}
                onCancelRepairs={onCancelRepairs}
              />
            </Box>

            <Box id="rightBottom" height="20%">
              <Evidence
                sourceTuple={evidence.sourceTuple}
                sourceTableName={evidence.sourceTableName}
                sourceRowNumber={evidence.sourceRowNumber}
                dirtyValue={evidence.dirtyValue}
                cleanValue={evidence.cleanValue}
                conflicSummary={evidence.conflicSummary}
                hasConflict={evidence.hasConflict}
                conflictData={evidence.conflictData}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RepairModule;
