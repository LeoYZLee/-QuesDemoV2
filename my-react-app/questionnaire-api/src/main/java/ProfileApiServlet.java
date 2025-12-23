package com.yourcompany.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 簡易個資聯繫單 API：接受 POST JSON 並追加寫入檔案（JSON Lines）。
 */
public class ProfileApiServlet extends HttpServlet {

    private static final String DATA_DIR_PATH = "D:\\Tomcat_Data\\Questionnaire_Config";
    private static final String FILE_NAME = "profiles.jsonl";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private Path targetFile;

    @Override
    public void init() throws ServletException {
        try {
            Path dirPath = Paths.get(DATA_DIR_PATH);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }
            targetFile = dirPath.resolve(FILE_NAME);
            if (!Files.exists(targetFile)) {
                Files.createFile(targetFile);
            }
        } catch (IOException e) {
            throw new ServletException("Failed to prepare profile data file", e);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        req.setCharacterEncoding("UTF-8");
        resp.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json; charset=UTF-8");
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

        String body = req.getReader().lines().collect(Collectors.joining(System.lineSeparator()));
        if (body == null || body.trim().isEmpty()) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Empty payload");
            return;
        }

        try {
            // 驗證可解析 JSON
            Object obj = objectMapper.readValue(body, Object.class);
            String normalized = objectMapper.writeValueAsString(obj);
            Files.writeString(
                targetFile,
                normalized + System.lineSeparator(),
                StandardCharsets.UTF_8,
                StandardOpenOption.APPEND
            );
            resp.getWriter().write("{\"status\":\"ok\"}");
        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to save profile: " + e.getMessage());
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        req.setCharacterEncoding("UTF-8");
        resp.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json; charset=UTF-8");
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

        String uuid = req.getParameter("uuid");
        if (uuid == null || uuid.trim().isEmpty()) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "uuid is required");
            return;
        }

        if (targetFile == null || !Files.exists(targetFile)) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND, "profiles file not found");
            return;
        }

        try (Stream<String> lines = Files.lines(targetFile, StandardCharsets.UTF_8)) {
            Optional<String> match = lines
                .filter(l -> l != null && l.contains(uuid))
                .findFirst();

            if (match.isPresent()) {
                resp.getWriter().write(match.get());
            } else {
                resp.sendError(HttpServletResponse.SC_NOT_FOUND, "not found");
            }
        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to read profile: " + e.getMessage());
        }
    }

    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response) throws IOException {
        request.setCharacterEncoding("UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }
}
