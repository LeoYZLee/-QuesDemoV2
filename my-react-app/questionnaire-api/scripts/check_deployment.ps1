param(
  [Parameter(Mandatory=$true)] [string]$Host,
  [Parameter(Mandatory=$false)] [string]$ManagerUser = "",
  [Parameter(Mandatory=$false)] [string]$ManagerPass = ""
)

# Ensure scheme present
if (-not ($Host.StartsWith('http://') -or $Host.StartsWith('https://'))) { $Host = "http://$Host" }

function Do-Request($uri) {
  try {
    $resp = Invoke-WebRequest -Uri $uri -UseBasicParsing -Method GET -SkipCertificateCheck -ErrorAction Stop
    Write-Host "[$($resp.StatusCode)] $uri"
  } catch {
    if ($_.Exception.Response -ne $null) {
      $status = $_.Exception.Response.StatusCode.Value__
      Write-Host "[$status] $uri - Error: $($_.Exception.Message)"
    } else {
      Write-Host "[ERR] $uri - $($_.Exception.Message)"
    }
  }
}

Write-Host "Checking root and health endpoints on $Host"
Do-Request "$Host/questionnaire/"
Do-Request "$Host/questionnaire/api/health"
Do-Request "$Host/questionnaire/api/questions"

# If tomcat manager provided, try listing apps
if ($ManagerUser -and $ManagerPass) {
  Write-Host "Checking Tomcat Manager list"
  $pair = "$ManagerUser:$ManagerPass"
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($pair)
  $b64 = [Convert]::ToBase64String($bytes)
  $headers = @{ Authorization = "Basic $b64" }
  try {
    $mgr = Invoke-WebRequest -Uri "$Host/manager/text/list" -Headers $headers -UseBasicParsing -Method GET -ErrorAction Stop
    Write-Host "Manager status: $($mgr.StatusCode)"
    $mgr.Content
  } catch {
    Write-Host "Manager access failed: $($_.Exception.Message)"
  }
}

Write-Host "Done"