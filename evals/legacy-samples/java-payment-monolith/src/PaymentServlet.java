package legacy.payments;

import java.io.IOException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public final class PaymentServlet extends HttpServlet {
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String paymentId = request.getParameter("paymentId");
        response.setStatus(202);
        response.getWriter().write("{\"paymentId\":\"" + paymentId + "\",\"status\":\"QUEUED\"}");
    }
}
