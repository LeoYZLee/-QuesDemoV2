Deployment and Build Instructions

Prerequisites
- Java 17+ and Maven 3.8+ installed.
- Node.js + npm if you prefer to build frontend manually (optional).

Build + Packaging (single WAR containing UI + API)

1) From repo root, run Maven package (it will run frontend build automatically):

   mvn -f questionnaire-api clean package -DskipTests

   The produced WAR will be: questionnaire-api/target/questionnaire.war

2) Deploy to Tomcat (local)

   - Copy the WAR file to Tomcat's webapps directory and start Tomcat:
     cp questionnaire-api/target/questionnaire.war $TOMCAT_HOME/webapps/

   - Context path will be /questionnaire (from war filename). To use a different path, rename the war accordingly.

3) Deploy to Azure App Service (Tomcat) using az CLI (example):

   az webapp deploy --resource-group <rg> --name <app> --src-path questionnaire-api/target/questionnaire.war --type war

Verification
- Index (UI): curl -i "http://<host>/questionnaire/"
- API health: curl -i "http://<host>/questionnaire/api/health" - should return 200 {"status":"ok"}
- GET questions: curl -i "http://<host>/questionnaire/api/questions"
- POST questions: curl -i -X POST -H "Content-Type: application/json" -d '@yourfile.json' "http://<host>/questionnaire/api/questions"

Scripts
- `scripts\deploy_azure.ps1`: PowerShell script to deploy WAR to Azure Web App and tail logs.
- `scripts\check_deployment.ps1`: PowerShell script to check root, health and questions endpoints; also attempts Tomcat Manager if credentials are provided.

Notes
- The WAR packaging uses the frontend build output from my-react-app/dist and QuestionnaireApp directories. The Vite build base is set to '/questionnaire/' by default; if deploying to a different context, set VITE_BASE before building.
- The Servlet supports a `dataDir` context-param configured in web.xml; set that in Tomcat's context or in web.xml if you want to point saved configs somewhere specific (e.g., outside webapps).
- If you don't want Maven to run frontend builds, modify the pom to skip frontend-maven-plugin or run `npm run build` in my-react-app manually before building the war.

Troubleshooting
- If you get 404 for `/questionnaire/` or `/questionnaire/api/health`, confirm the WAR is deployed and running in Tomcat. Use `az webapp log tail` for Azure App Service or check Tomcat `catalina.out`.
- To get a listing of deployed contexts on Tomcat Manager (if enabled):
   - `curl -u <manager_user>:<manager_pass> "http://<host>/manager/text/list"`



cd "d:\Work\proj\QuesDemo\my-react-app\questionnaire"; mvn package -DskipTests