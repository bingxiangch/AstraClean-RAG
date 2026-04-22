import React, { useState, useEffect } from "react";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport,
  useGridApiRef,
} from "@mui/x-data-grid";
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import NotInterestedIcon from "@mui/icons-material/NotInterested";
import InfoIcon from "@mui/icons-material/Info";

const CustomToolbar = (props) => (
  <GridToolbarContainer>
    <ButtonGroup
      disableElevation
      variant="contained"
      sx={{ mb: "4px", height: 50 }}
    >
      <GridToolbarExport />
      {Object.keys(props.result.data).length !== 0 && (
        <Button
          startIcon={<KeyboardDoubleArrowDownIcon />}
          onClick={props.onApplyRepairs}
        >
          Clean & Log (Append)
        </Button>
      )}
      {Object.keys(props.result.data).length !== 0 && (
        <Button
          startIcon={<NotInterestedIcon />}
          onClick={props.onCancelRepairs}
        >
          Cancel
        </Button>
      )}
    </ButtonGroup>
  </GridToolbarContainer>
);

const ResultCell = (props) => (
  <Box>
    {props.params.value !== null && (
      <Box display="flex" justifyContent="space-between">
        <FormControlLabel
          label={props.params.value}
          control={
            <Checkbox
              checked={props.result.marked.has(props.params.id)}
              onChange={() => {
                console.log("Marking result at id:", props.params.id);
                props.onMarkResult(props.params.id);
              }}
            />
          }
        />
        {props.isIndexSelected && (
          <Button
            startIcon={<InfoIcon />}
            onClick={() => {
              console.log("Info button clicked, params.id:", props.params.id);
              props.onShowEvidence(props.params.id);
            }}
            size="small"
          />
        )}
      </Box>
    )}
  </Box>
);

const DataTable = (props) => {
  const theme = useTheme();
  const headerTextColor = theme.palette.custom.table.headers.color;
  const headerBackgroundColor =
    theme.palette.custom.table.headers.backgroundColor;
  const tableBorderColor = theme.palette.custom.table.border.main;
  const resultCellColor = theme.palette.custom.table.resultCell.backgroundColor;
  const emptyCellColor = theme.palette.custom.table.emptyCell.backgroundColor;
  const [table, setTable] = useState({ columns: [], rows: [] });
  const apiRef = useGridApiRef();
  const [resultColumnAdded, setResultColumnAdded] = useState(false);

  useEffect(() => {
    const rows = props.dirtyDataContent.map((data, i) => {
      // Create a new object without the 'id' field from CSV if it exists
      const { id: dataId, ...dataWithoutId } = data;
      return { id: i, ...dataWithoutId };
    });
    const idColumn = {
      field: "id",
      headerName: "ID",
      headerClassName: "normal--header",
    };

    console.log("=== DataTable useEffect ===");
    console.log("props.dirtyDataContent.length:", props.dirtyDataContent.length);
    console.log("rows created:", rows);
    console.log("rows.length:", rows.length);
    console.log("First row id:", rows[0]?.id);
    console.log("Last row id:", rows[rows.length - 1]?.id);

    const updatedColumns = props.columns
      .filter(header => header !== "id") // Filter out the CSV's original id column
      .map((header) => {
      return {
        field: header,
        headerName: header,
        headerClassName: getHeaderClass(header, props),
        width: getColumnWidth(header),
        editable: true, // All columns are editable
        ...(header === props.resultColumn && {
          cellClassName: (params) => {
            const idx = params.id;
            // Add null checks to prevent "Cannot read properties of undefined" errors
            if (!rows[idx] || !props.dirtyColumn) return "";
            const dirtyCell = rows[idx][props.dirtyColumn];
            if (dirtyCell === undefined || dirtyCell === null) return "";
            const dirtyVal = String(dirtyCell).toLowerCase().trim();
            const resultVal = params.value ? String(params.value).toLowerCase().trim() : "";
            if (!resultVal) return "empty--cell";
            if (resultVal !== dirtyVal) return "result--cell";
            return "";
          },
          renderCell: (params) => (
            <ResultCell
              params={params}
              result={props.result}
              isIndexSelected={props.isIndexSelected}
              onMarkResult={props.onMarkResult}
              onShowEvidence={props.onShowEvidence}
            />
          ),
        }),
      };
    });

    // Check if the result column is added for the first time
    if (
      !table.columns.some((col) => col.field === props.resultColumn) &&
      props.columns.includes(props.resultColumn)
    ) {
      setResultColumnAdded(true);
    }

    setTable({ columns: [idColumn, ...updatedColumns], rows: rows });
  }, [
    props.dirtyDataContent,
    props.result.marked,
    props.dirtyColumn,
    props.pivotColumns,
  ]);

  // Scroll to the right when the resultColumn is added for the first time
  useEffect(() => {
    if (resultColumnAdded) {
      setTimeout(() => {
        apiRef.current.scrollToIndexes({
          rowIndex: 0,
          colIndex: table.columns.length - 1,
        });
      }, 0);
      setResultColumnAdded(false);
    }
  }, [resultColumnAdded, table.columns.length, apiRef]);

  const onColumnWidthChange = (params) => {
    const newColumns = table.columns.map((col) =>
      col.field === params.field ? { ...col, width: params.width } : { ...col }
    );
    setTable({ ...table, columns: newColumns });
  };

  const getColumnWidth = (header) => {
    const minWidth = 150;
    const factor = 10;
    const additionalWidth = header === props.resultColumn ? 66 : 0;
    
    // Add safety check for dirtyDataContent
    if (!props.dirtyDataContent || props.dirtyDataContent.length === 0) {
      return minWidth + additionalWidth;
    }
    
    return (
      Math.max(
        minWidth,
        header.length * factor,
        ...props.dirtyDataContent.map((row) => {
          if (!row || !row[header]) return 0;
          return String(row[header]).length * factor;
        })
      ) + additionalWidth
    );
  };

  const getHeaderClass = (header, props) => {
    if (header === props.resultColumn) return "result--header";
    if (header === props.dirtyColumn && header !== props.resultColumn)
      return "dirty--header";
    if (
      props.pivotColumns.has(header) &&
      header !== props.resultColumn &&
      header !== props.dirtyColumn
    )
      return "pivot--header";
    return "normal--header";
  };

  const handleProcessRowUpdate = (newRow) => {
    // Update the row in local state
    const updatedRows = table.rows.map((row) =>
      row.id === newRow.id ? newRow : row
    );
    setTable({ ...table, rows: updatedRows });
    
    // Notify parent component via onEditCell if it exists
    // Parent can handle saving to result.data if needed
    const updatedData = { ...newRow };
    delete updatedData.id; // Remove the id since it's the array index
    
    console.log("Row updated at index", newRow.id, ":", updatedData);
    
    return newRow;
  };

  return (
    <DataGrid
      apiRef={apiRef}
      rows={table.rows}
      columns={table.columns}
      onColumnWidthChange={onColumnWidthChange}
      processRowUpdate={handleProcessRowUpdate}
      isRowSelectable={() => false}
      slots={{ toolbar: () => CustomToolbar(props) }}
      sx={{
        fontSize: "1.0rem",
        ".MuiDataGrid-cell": {
          border: 1,
          borderColor: tableBorderColor,
        },
        "& .MuiDataGrid-sortIcon": {
          opacity: 1,
          color: headerTextColor,
        },
        "& .MuiDataGrid-menuIconButton": {
          opacity: 1,
          color: headerTextColor,
        },
        "& .normal--header": {
          backgroundColor: headerBackgroundColor,
          color: headerTextColor,
        },
        "& .dirty--header": {
          backgroundColor: "red",
          color: headerTextColor,
        },
        "& .pivot--header": {
          backgroundColor: "orange",
          color: headerTextColor,
        },
        "& .result--header": {
          backgroundColor: "green",
          color: headerTextColor,
        },
        "& .result--cell": {
          backgroundColor: resultCellColor,
        },
        "& .empty--cell": {
          backgroundColor: emptyCellColor,
        },
      }}
    />
  );
};

export default DataTable;
