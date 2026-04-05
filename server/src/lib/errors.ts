export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class QRExpiredOrUsedError extends AppError {
  constructor() {
    super('QR code expired or already used', 400);
  }
}

export class AmountMismatchError extends AppError {
  constructor() {
    super('Amount does not match. Please check your total and try again.', 400);
  }
}

export class NoTransactionFoundError extends AppError {
  constructor() {
    super('No matching transaction found. Please check your total and try again.', 400);
  }
}

export class VelocityLimitError extends AppError {
  constructor() {
    super('Daily transaction limit reached for this vendor.', 429);
  }
}

export class InsufficientPointsError extends AppError {
  constructor() {
    super('Insufficient points for this redemption.', 400);
  }
}

export class AlreadyClaimedError extends AppError {
  constructor() {
    super('This transaction has already been claimed.', 409);
  }
}
