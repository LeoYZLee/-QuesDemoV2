package com.yourcompany.api;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * SPA fallback so deep links (e.g., /questionnaire/admin or /survey) return index.html
 * instead of 404. API and static assets pass through unchanged.
 */
public class SpaFallbackFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        if (!(request instanceof HttpServletRequest) || !(response instanceof HttpServletResponse)) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        if (!"GET".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String contextPath = req.getContextPath() == null ? "" : req.getContextPath();
        String fullUri = req.getRequestURI();
        String path = fullUri.startsWith(contextPath) ? fullUri.substring(contextPath.length()) : fullUri;

        boolean isApi = path.startsWith("/api/");
        boolean hasExtension = path.contains(".");
        boolean isRoot = "/".equals(path) || path.isEmpty();

        if (isApi || hasExtension || isRoot) {
            chain.doFilter(request, response);
            return;
        }

        RequestDispatcher dispatcher = request.getRequestDispatcher("/index.html");
        dispatcher.forward(request, response);
    }
}
