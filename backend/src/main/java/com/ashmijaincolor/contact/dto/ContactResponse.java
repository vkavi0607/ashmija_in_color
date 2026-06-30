package com.ashmijaincolor.contact.dto;

public class ContactResponse {

  private boolean success;
  private String message;

  public ContactResponse(boolean success, String message) {
    this.success = success;
    this.message = message;
  }

  public static ContactResponse success(String message) {
    return new ContactResponse(true, message);
  }

  public static ContactResponse failure(String message) {
    return new ContactResponse(false, message);
  }

  public boolean isSuccess() {
    return success;
  }

  public String getMessage() {
    return message;
  }
}
