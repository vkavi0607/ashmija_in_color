package com.ashmijaincolor.contact.service;

import com.ashmijaincolor.contact.dto.ContactRequest;

public interface ContactNotificationService {

  void sendContactMessage(ContactRequest request);
}
