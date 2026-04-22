import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const DataTuple = (props) => {
  const theme = useTheme();
  const backgroundColor = theme.palette.background.paper;
  const headerTextColor = theme.palette.custom.table.headers.color;
  const headerBackgroundColor =
    theme.palette.custom.table.headers.backgroundColor;
  const tableBorderColor = theme.palette.custom.table.border.main;
  const [table, setTable] = useState({ columns: [], row: [] });

  useEffect(() => {
    // Add null check and handle citation as array
    if (!props.sourceTuple || props.sourceTuple.length === 0) {
      setTable({ ...table, columns: [], row: [] });
      return;
    }
    
    const firstTuple = props.sourceTuple[0];
    const row = [{ id: 1, ...firstTuple }];
    const idColumn = { field: "id", headerName: "ID" };
    const otherColumns = Object.keys(firstTuple).map((header) => {
      const minWidth = 100;
      const contentWidth = Math.max(
        firstTuple[header]?.toString().length * 10,
        header.length * 10
      );
      const width = Math.max(contentWidth, minWidth);
      return {
        field: header,
        headerName: header,
        width: width,
      };
    });
    const columns = [idColumn, ...otherColumns];

    setTable({ ...table, columns: columns, row: row });
  }, [props.sourceTuple]);
  return (
    <Box>
      <Paper sx={{ paddingLeft: "15px", paddingTop: "10px", paddingBottom: "10px", backgroundColor: backgroundColor }}>
        {props.sourceTuple && props.sourceTuple.length > 0 ? (
          <>
            <Typography fontSize="1.1rem" style={{ marginBottom: "8px" }}>
              <span style={{ fontWeight: "bold" }}>Citation Source:</span> {props.sourceTuple[0].table_name}
            </Typography>
            
            <Typography fontSize="1.1rem" style={{ marginBottom: "8px" }}>
              <span style={{ fontWeight: "bold" }}>Repair Log:</span> {props.sourceTuple[0].values.split(" || ")[0]}
            </Typography>
            
            <Typography fontSize="1.1rem" style={{ marginBottom: "8px" }}>
              <span style={{ fontWeight: "bold" }}>Domain Rule:</span> {props.sourceTuple[0].values.includes(" || ") ? props.sourceTuple[0].values.split(" || ")[1] : "N/A"}
            </Typography>
            
            {/* {props.dirtyValue !== null && (
              <Typography fontSize="1.1rem" style={{ marginBottom: "8px" }}>
                <span style={{ fontWeight: "bold" }}>Dirty Value:</span> <span style={{ color: "#d32f2f" }}>'{props.dirtyValue}'</span>
              </Typography>
            )} */}
            
            
            {/* <Typography fontSize="1.1rem">
              <span style={{ fontWeight: "bold" }}>Potential Conflict:</span>{" "}
              <span style={{ color: "red" }}>
                {props.conflicSummary || "None"}
              </span>
            </Typography> */}

      <Typography fontSize="1.1rem" style={{ marginBottom: "8px" }}>
        {props.dirtyValue !== null && (
          <>
            <span style={{ fontWeight: "bold" }}>Dirty Value:</span>{" "}
            <span style={{ color: "#d32f2f" }}>'{props.dirtyValue}'</span>
            {" | "}
          </>
        )}
        {props.conflictData && props.conflictData.mode === "conflict" && (
          <>
            <span style={{ fontWeight: "bold" }}>⚠️ Conflict:</span>{" "}
            <span style={{ color: "#d32f2f" }}>
              {Object.entries(props.conflictData.sources || {}).map(([sourceType, info], idx) => (
                <span key={sourceType}>
                  {sourceType.replace(/_/g, " ")} suggests to convert into decimal with potential value {info.score?.toFixed(4)}
                  {idx < Object.entries(props.conflictData.sources || {}).length - 1 && " | "}
                </span>
              ))}
            </span>
          </>
        )}
      </Typography>

      {props.conflictData && props.conflictData.mode === "conflict" && props.conflictData.reasoning && (
        <Typography fontSize="0.95rem" style={{ marginBottom: "8px", color: "#2e7d32" }}>
          <span style={{ fontWeight: "bold" }}>Suggest:</span> {props.conflictData.reasoning}
        </Typography>
      )}

      {/* 实际 conflict data 的显示代码 (已注释) */}
      {/* 
      {props.conflictData && (
        <Box style={{ marginTop: "12px", padding: "10px", backgroundColor: props.conflictData.mode === "conflict" ? "rgba(211, 47, 47, 0.08)" : "rgba(46, 125, 50, 0.08)", borderRadius: "4px", border: `1px solid ${props.conflictData.mode === "conflict" ? "#d32f2f" : "#2e7d32"}` }}>
          {/* Mode indicator */}
          {/* <Typography fontSize="0.95rem" style={{ marginBottom: "6px" }}>
            <span style={{ fontWeight: "bold", color: props.conflictData.mode === "conflict" ? "#d32f2f" : "#2e7d32" }}>
              {props.conflictData.mode === "conflict" ? "⚠️ Conflict Detected" : "✓ Sources Aligned"}
            </span>
            {props.conflictData.severity && props.conflictData.severity !== "none" && (
              <span style={{ marginLeft: "8px", color: "#666" }}>
                (Severity: <strong>{props.conflictData.severity}</strong>)
              </span>
            )}
          </Typography>

          {/* Sources breakdown */}
          {/* {props.conflictData.sources && Object.keys(props.conflictData.sources).length > 0 && (
            <Box style={{ marginTop: "8px", paddingLeft: "12px", borderLeft: "3px solid #ccc" }}>
              {Object.entries(props.conflictData.sources).map(([sourceType, info]) => (
                <Typography key={sourceType} fontSize="0.9rem" style={{ marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold", textTransform: "capitalize" }}>
                    {sourceType.replace(/_/g, " ")}:
                  </span>{" "}
                  <span>"{info.value}" (score: {info.score?.toFixed(3)})</span>
                </Typography>
              ))}
            </Box>
          )}

          {/* LLM Decision */}
          {/* {props.conflictData.decision && (
            <Typography fontSize="0.9rem" style={{ marginTop: "8px", fontStyle: "italic", color: "#444" }}>
              <span style={{ fontWeight: "bold" }}>Decision:</span> {props.conflictData.decision}
            </Typography>
          )}

          {/* LLM Reasoning */}
          {/* {props.conflictData.reasoning && (
            <Typography fontSize="0.85rem" style={{ marginTop: "6px", color: "#666", fontStyle: "italic" }}>
              <span style={{ fontWeight: "bold" }}>Reasoning:</span> {props.conflictData.reasoning}
            </Typography>
          )}

          {/* Confidence */}
          {/* {props.conflictData.confidence && (
            <Typography fontSize="0.85rem" style={{ marginTop: "4px", color: "#999" }}>
              LLM Confidence: {(props.conflictData.confidence * 100).toFixed(0)}%
            </Typography>
          )}
        </Box>
      )}
      */}
          </>
        ) : (
          <Typography fontSize="1.1rem" style={{ color: "gray" }}>
            No evidence selected. Click the info icon on any row to view repair details.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default DataTuple;
