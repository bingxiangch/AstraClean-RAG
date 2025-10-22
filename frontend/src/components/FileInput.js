import React from "react";
import { Stack, Button, TextField } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

const FileInput = (props) => {
  const {
    disabled,
    fileName,
    onChange,
    // accept both CSV and JSONL by default; change to ".csv" if you want only CSV
    accept = ".csv,.jsonl",
    placeholderSingle = "No file selected",
  } = props;

  return (
    <Stack direction="row" justifyContent="left" spacing={2} alignItems="center">
      <Button
        startIcon={<UploadFileIcon />}
        disabled={disabled}
        disableElevation
        variant="contained"
        component="label"
        sx={{ px: 2 }}
      >
        Browse
        <input
          hidden
          type="file"
          accept={accept}
          multiple={false}                 // force single file
          onChange={(e) => onChange(e.target.files)}  // keep same signature
        />
      </Button>

      <TextField
        fullWidth
        value={fileName}
        placeholder={placeholderSingle}
        InputProps={{ readOnly: true }}
      />
    </Stack>
  );
};

export default FileInput;



// import React from "react";
// import { Stack, Button, TextField } from "@mui/material";
// import UploadFileIcon from "@mui/icons-material/UploadFile";

// const FileInput = (props) => {
//   return (
//     <Stack direction="row" justifyContent="left">
//       <Button
//         startIcon={<UploadFileIcon />}
//         disabled={props.disabled}
//         disableElevation
//         variant="contained"
//         component="label"
//         sx={{ px: 2 }}
//       >
//         Browse
//         <input
//           hidden
//           type="file"
//           accept=".csv"
//           onChange={(e) => props.onChange(e.target.files)}
//           multiple={props.type === "multiple"}
//           webkitdirectory={props.type === "multiple" ? "true" : undefined}
//         />
//       </Button>
//       <TextField
//         fullWidth
//         value={props.fileName}
//         placeholder={
//           props.type === "single" ? "No file selected" : "No folder selected"
//         }
//         InputProps={{ readOnly: true }}
//       />
//     </Stack>
//   );
// };

// export default FileInput;
