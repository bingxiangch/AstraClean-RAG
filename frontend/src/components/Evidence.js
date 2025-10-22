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
    const row = [{ id: 1, ...props.sourceTuple }];
    const idColumn = { field: "id", headerName: "ID" };
    const otherColumns = Object.keys(props.sourceTuple).map((header) => {
      const minWidth = 100;
      const contentWidth = Math.max(
        props.sourceTuple[header]?.toString().length * 10,
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
      <Paper sx={{ paddingLeft: "5px", backgroundColor: backgroundColor }}>
        <Typography fontSize="1.3rem">
          <span style={{ fontWeight: "bold" }}>Citation Source: </span>
          {props.sourceTuple[0].table_name}
        </Typography>
        <Typography fontSize="1.3rem">
          <span style={{ fontWeight: "bold" }}>Evidence: </span>
          {props.sourceTuple[0].values}
        </Typography>
      </Paper>
    </Box>
  );
};

export default DataTuple;
