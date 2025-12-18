param(
  [Parameter(Mandatory=$true)] [string]$ResourceGroup,
  [Parameter(Mandatory=$true)] [string]$AppName,
  [Parameter(Mandatory=$false)] [string]$WarPath = "target/questionnaire.war"
)

# Deploy the WAR to Azure Web App (Tomcat)
Write-Host "Deploying $WarPath to Azure App $AppName in RG $ResourceGroup"
az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path $WarPath --type war

# Tail logs for 30s to watch startup
Write-Host "Tailing logs (CTRL-C to stop)."
az webapp log tail --name $AppName --resource-group $ResourceGroup
