const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const pool = require("./config/database");
const projectRoutes = require("./routes/projectRoutes");
const documentRoutes = require("./routes/documentRoutes");
const revisionRoutes = require("./routes/revisionRoutes");
const revisionRuleRoutes = require("./routes/revisionRuleRoutes");
const customerTransmittalRoutes = require(
  "./routes/customerTransmittalRoutes"
);
const revisionVerificationRoutes =
  require("./routes/revisionVerificationRoutes");

const customerResponseRoutes =
  require("./routes/customerResponseRoutes");  

const signatureRoutes =
  require("./routes/signatureRoutes");

const documentApprovalRoutes =
  require("./routes/documentApprovalRoutes");

const revisionWorkflowRoutes =
  require("./routes/revisionWorkflowRoutes");

const authRoutes =
  require("./routes/authRoutes");

const userRoutes =
  require("./routes/userRoutes");

const projectMemberRoutes =
  require("./routes/projectMemberRoutes");

const projectCoverPageTemplateRoutes =
  require("./routes/projectCoverPageTemplateRoutes");
  
const projectCoverPageConfigRoutes =
  require("./routes/projectCoverPageConfigRoutes");

  
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/projects", projectRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/revisions", revisionRoutes);
app.use("/api/revision-rules", revisionRuleRoutes);
app.use(
  "/api/customer-transmittals",
  customerTransmittalRoutes
);
app.use(
  "/api/revision-verification",
  revisionVerificationRoutes
);
app.use(
  "/api/customer-responses",
  customerResponseRoutes
);
app.use(
  "/api/signatures",
  signatureRoutes
);
app.use(
  "/api/document-approval",
  documentApprovalRoutes
);
app.use(
  "/api/revision-workflow",
  revisionWorkflowRoutes
);
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/project-members",
  projectMemberRoutes
);

app.use(
  "/api/project-cover-page-templates",
  projectCoverPageTemplateRoutes
);

app.use(
  "/api/project-cover-page-configs",
  projectCoverPageConfigRoutes
);




app.get("/", (req, res) => {
  res.json({
    message: "Document Control System API is running",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "PostgreSQL connection successful",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});