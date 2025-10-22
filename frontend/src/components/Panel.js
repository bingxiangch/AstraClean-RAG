import React from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  TextField,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
import Grid from "@mui/material/Unstable_Grid2";

import FileInput from "./FileInput";
import CustomSelect from "./CustomSelect";

const buttonTheme = createTheme({
  palette: {
    green: { main: "#1cc533", contrastText: "#ffffff" },
  },
  shape: { borderRadius: 40 },
});

// Wrap a component with a label
const ComponentGridWithName = (name, WrappedComponent) => {
  return (props) => (
    <Grid container spacing={1}>
      <Grid xs={12}>
        <Paper elevation={0}>
          <Typography>{name}</Typography>
        </Paper>
      </Grid>
      <Grid xs={12}>
        <WrappedComponent {...props} />
      </Grid>
    </Grid>
  );
};

// Multi-select for search index
const MultiIndexSelect = ComponentGridWithName(
  "Search Index Name",
  ({
    label = "Search Index",
    indices = [],                 // ✅ safe default
    selection = [],               // ✅ safe default
    onChange = () => {},          // ✅ no-op default
  }) => {
    const labelId = "multi-index-label";

    const handleChange = (event) => {
      const value = event.target.value;
      // MUI multiple can return string or array
      const next = Array.isArray(value)
        ? value
        : String(value)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      onChange(next);
    };

    return (
      <FormControl fullWidth>
        <InputLabel id={labelId}>{label}</InputLabel>
        <Select
          labelId={labelId}
          multiple
          value={Array.isArray(selection) ? selection : []}
          onChange={handleChange}
          label={label}
          renderValue={(selected) =>
            Array.isArray(selected) ? selected.join(", ") : ""
          }
        >
          {(indices ?? []).map((index) => (
            <MenuItem key={index} value={index}>
              <Checkbox
                checked={
                  Array.isArray(selection) && selection.includes(index)
                }
              />
              <ListItemText primary={index} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }
);


// Wrapped components
const DirtyDataFileInput = ComponentGridWithName("Upload Dirty Data", FileInput);
const DirtyColumnSelect = ComponentGridWithName("Target Column", CustomSelect);
const EntityDescriptionTextField = ComponentGridWithName(
  "Cleaning Guidance",
  TextField
);
const ReasonerSelect = ComponentGridWithName("Reasoner", CustomSelect);

// Panel Component
const Panel = (props) => {
  const theme = useTheme();
  const backgroundColor = theme.palette.background.paper;

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={2}
      height="100%"
      width="100%"
      padding={2}
      bgcolor={backgroundColor}
    >
      <DirtyDataFileInput
        type="single"
        fileName={props.dirtyDataFileName}
        onChange={props.onChangeDirtyDataFile}
      />
      <DirtyColumnSelect
        disabled={!props.isDirtyDataUploaded}
        label="Select"
        selection={props.dirtyColumn}
        multiple={false}
        includeGroupNames={false}
        groupedOptions={[{ name: "columns", options: props.columns }]}
        onChange={props.onSelectDirtyColumn}
      />

      <EntityDescriptionTextField
        disabled={!props.isDirtyDataUploaded}
        label="Guidance ..."
        fullWidth
        multiline
        rows={2}
        value={props.entityDescription}
        onChange={(e) => props.onChangeEntityDescription(e.target.value)}
      />
      <ReasonerSelect
        label="Select"
        selection={props.reasonerName}
        includeGroupNames={true}
        groupedOptions={props.reasonerNames}
        onChange={props.onSelectReasonerName}
      />

      <MultiIndexSelect
        label="Select"
        indices={props.searchIndexNames}
        selection={props.searchIndexName}
        onChange={props.onSelectSearchIndexName}
      />

      <Grid xs={12} display="flex" justifyContent="flex-end" paddingTop={1}>
        <ThemeProvider theme={buttonTheme}>
          <Button
            disabled={
              !props.isDirtyDataUploaded ||
              props.dirtyColumn === "" ||
              props.reasonerName === "" ||
              props.isLoading
            }
            disableElevation
            variant="contained"
            color="green"
            onClick={props.onRunJob}
            sx={{ width: 120, height: 50 }}
          >
            {props.isLoading ? <CircularProgress size={24} /> : "Start"}
          </Button>
        </ThemeProvider>
      </Grid>
    </Box>
  );
};

export default Panel;
