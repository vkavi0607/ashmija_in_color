package com.ashmijaincolor.contact.service;

import com.ashmijaincolor.contact.dto.ContactRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EmailContactNotificationService implements ContactNotificationService {

  private static final Logger LOGGER = LoggerFactory.getLogger(EmailContactNotificationService.class);

  private final JavaMailSender mailSender;
  private final String deliveryMode;
  private final String recipientEmail;
  private final String fromEmail;

  public EmailContactNotificationService(
      JavaMailSender mailSender,
      @Value("${contact.delivery-mode:log}") String deliveryMode,
      @Value("${contact.recipient-email:srinithi7325@gmail.com}") String recipientEmail,
      @Value("${spring.mail.username:}") String fromEmail
  ) {
    this.mailSender = mailSender;
    this.deliveryMode = deliveryMode;
    this.recipientEmail = recipientEmail;
    this.fromEmail = fromEmail;
  }

  @Override
  public void sendContactMessage(ContactRequest request) {
    String subject = "New contact inquiry - ashmija in color";
    String body = buildMessage(request);

    if (!"email".equalsIgnoreCase(deliveryMode)) {
      LOGGER.info("Contact email log mode. To: {}, Subject: {}, Body: {}", recipientEmail, subject, body);
      return;
    }

    if (!StringUtils.hasText(fromEmail)) {
      throw new IllegalStateException("SMTP_USER is required when CONTACT_DELIVERY_MODE=email.");
    }

    SimpleMailMessage mailMessage = new SimpleMailMessage();
    mailMessage.setTo(recipientEmail);
    mailMessage.setFrom(fromEmail);
    mailMessage.setReplyTo(request.getEmail());
    mailMessage.setSubject(subject);
    mailMessage.setText(body);

    mailSender.send(mailMessage);
  }

  private String buildMessage(ContactRequest request) {
    StringBuilder message = new StringBuilder();
    message.append("New contact inquiry - ashmija in color\n\n");
    message.append("Name: ").append(request.getFirstName()).append(" ").append(request.getLastName()).append("\n");
    message.append("Email: ").append(request.getEmail()).append("\n");
    message.append("Phone: ").append(valueOrDash(request.getPhone())).append("\n");
    message.append("Project: ").append(request.getProjectType()).append("\n\n");
    message.append("Message:\n").append(valueOrDash(request.getMessage()));
    return message.toString();
  }

  private String valueOrDash(String value) {
    return StringUtils.hasText(value) ? value.trim() : "-";
  }
}
