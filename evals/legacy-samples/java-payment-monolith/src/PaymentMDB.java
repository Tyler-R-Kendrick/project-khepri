package legacy.payments;

import javax.jms.Message;
import javax.jms.MessageListener;
import javax.jms.TextMessage;

public final class PaymentMDB implements MessageListener {
    public void onMessage(Message message) {
        // Legacy container transaction boundary covers parse, DAO write, and acknowledgement.
        PaymentDao.persistFromMessage((TextMessage) message);
    }
}
