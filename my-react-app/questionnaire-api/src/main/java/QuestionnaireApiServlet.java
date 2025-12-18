package com.yourcompany.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Collectors;

public class QuestionnaireApiServlet extends HttpServlet {

    // 固定路徑設定
    private static final String DATA_DIR_PATH = "D:\\Tomcat_Data\\Questionnaire_Config";
    private static final String FILE_NAME = "config.json";
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void init() throws ServletException {
        // 初始化：確保資料夾存在
        Path dirPath = Paths.get(DATA_DIR_PATH);
        try {
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
                System.out.println("[Init] Created data directory: " + DATA_DIR_PATH);
            } else {
                System.out.println("[Init] Using data directory: " + DATA_DIR_PATH);
            }
        } catch (IOException e) {
            System.err.println("[Init] Failed to create data directory: " + e.getMessage());
            throw new ServletException("Initialization failed.", e);
        }
    }

    /** * 處理 GET 請求：讀取設定檔 
     * 關鍵：讀取檔案時指定 UTF-8，回傳時指定 application/json; charset=UTF-8
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        // 1. 設定回應編碼 (必須在 getWriter 之前)
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json; charset=UTF-8");
        
        // CORS 設定
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");

        PrintWriter out = response.getWriter();
        Path filePath = Paths.get(DATA_DIR_PATH, FILE_NAME);

        if (Files.exists(filePath)) {
            try {
                // 2. 讀取檔案時明確指定 UTF-8
                String content = Files.readString(filePath, StandardCharsets.UTF_8);
                
                if (content == null || content.trim().isEmpty()) {
                    out.print("[]");
                } else {
                    out.print(content);
                }
            } catch (IOException e) {
                e.printStackTrace();
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Error reading config file.");
            }
        } else {
            // 檔案不存在回傳空陣列
            out.print("[]");
        }
        out.flush();
    }

    /** * 處理 POST 請求：儲存設定檔
     * 關鍵：request.setCharacterEncoding("UTF-8") 必須在讀取 body 之前執行
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        // 1. 【關鍵修正】強制指定請求內容為 UTF-8 (解決接收時變成亂碼的問題)
        request.setCharacterEncoding("UTF-8");

        // 2. 設定回應編碼
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json; charset=UTF-8");
        
        // CORS 設定
        response.setHeader("Access-Control-Allow-Origin", "*"); 
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

        // 3. 讀取 Request Body
        String jsonPayload;
        try (var reader = request.getReader()) {
            jsonPayload = reader.lines().collect(Collectors.joining(System.lineSeparator()));
        }
        
        if (jsonPayload == null || jsonPayload.trim().isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Empty payload received.");
            return;
        }

        try {
            File configFile = Paths.get(DATA_DIR_PATH, FILE_NAME).toFile();
            
            // 解析 JSON 並重新格式化 (Pretty Print)
            Object jsonObject = objectMapper.readValue(jsonPayload, Object.class);
            String prettyJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonObject);
            
            // 4. 寫入檔案時明確指定 UTF-8
            Files.writeString(configFile.toPath(), prettyJson, StandardCharsets.UTF_8);

            response.setStatus(HttpServletResponse.SC_OK);
            // 回傳的訊息也包含中文，測試回應編碼是否正常
            response.getWriter().write("{\"status\": \"success\", \"message\": \"設定已儲存 (UTF-8 OK)\"}");
            
        } catch (Exception e) {
            System.err.println("[Error] Saving configuration: " + e.getMessage());
            e.printStackTrace();
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Error saving file: " + e.getMessage());
        }
    }

    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        request.setCharacterEncoding("UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }
}