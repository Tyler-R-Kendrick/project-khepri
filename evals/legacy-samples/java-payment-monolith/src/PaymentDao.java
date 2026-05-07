package legacy.payments;

import javax.jms.TextMessage;

public final class PaymentDao {
    public static void persistFromMessage(TextMessage message) {
        // Persistence parity fixture: duplicate payment ids map to checked exception handling.
    }
}
