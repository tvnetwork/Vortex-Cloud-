const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/App.tsx',
  'src/pages/ProjectDetails.tsx',
  'src/pages/CreateDeployment.tsx',
  'src/pages/DeploymentDetails.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/AdminDashboard.tsx',
  'src/pages/CreateProject.tsx'
];

filesToUpdate.forEach(filePath => {
  const absolutePath = path.join(__dirname, filePath);
  if (fs.existsSync(absolutePath)) {
    let content = fs.readFileSync(absolutePath, 'utf8');
    
    // Replace types
    content = content.replace(/\bService\b/g, 'Deployment');
    
    // Replace collections and variables
    content = content.replace(/services/g, 'deployments');
    content = content.replace(/serviceId/g, 'deploymentId');
    content = content.replace(/service/g, 'deployment');
    
    // Replace component names
    content = content.replace(/DeployService/g, 'CreateDeployment');
    content = content.replace(/ServiceConsole/g, 'DeploymentDetails');
    
    fs.writeFileSync(absolutePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.warn(`File not found: ${filePath}`);
  }
});
