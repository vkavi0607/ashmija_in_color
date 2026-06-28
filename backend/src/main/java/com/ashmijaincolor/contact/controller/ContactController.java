package com.ashmijaincolor.contact.controller;

import com.ashmijaincolor.contact.dto.ContactRequest;
import com.ashmijaincolor.contact.dto.ContactResponse;
import com.ashmijaincolor.contact.service.ContactNotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

  private final ContactNotificationService contactNotificationService;

  public ContactController(ContactNotificationService contactNotificationService) {
    this.contactNotificationService = contactNotificationService;
  }

  @PostMapping
  public ContactResponse submitContact(@Valid @RequestBody ContactRequest request) {
    contactNotificationService.sendContactMessage(request);
    return ContactResponse.success("Contact details emailed successfully.");
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ContactResponse> handleValidation(MethodArgumentNotValidException exception) {
    String message = exception.getBindingResult()
        .getFieldErrors()
        .stream()
        .map(this::formatFieldError)
        .collect(Collectors.joining(", "));

    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(ContactResponse.failure(message));
  }

  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<ContactResponse> handleRuntime(RuntimeException exception) {
    return ResponseEntity
        .status(HttpStatus.BAD_GATEWAY)
        .body(ContactResponse.failure(exception.getMessage()));
  }

  private String formatFieldError(FieldError error) {
    return error.getField() + " " + error.getDefaultMessage();
  }
}
