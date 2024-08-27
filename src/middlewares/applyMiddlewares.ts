import { TMiddleware, TRule } from './controllers.types';

export const applyMiddlewares = (
  rules: TRule[],
  middlewares: TMiddleware[],
): TRule[] =>
  rules.map(([regexp, handler]: TRule) => [
    regexp,
    middlewares.reduce((acc, mw) => mw(acc), handler),
  ]);
