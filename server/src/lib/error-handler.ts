import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errors.js';

export function errorHandler(
  error: FastifyError | AppError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message });
  }

  // Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({ error: error.message });
  }

  console.error('Unhandled error:', error);
  return reply.status(500).send({ error: 'Internal server error' });
}
