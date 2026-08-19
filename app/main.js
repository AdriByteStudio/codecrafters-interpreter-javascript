import fs from "fs";

const args = process.argv.slice(2); // Skip the first two arguments (node path and script path)

if (args.length < 2) {
  console.error("Usage: ./your_program.sh tokenize <filename>");
  process.exit(1);
}

const command = args[0];
const filename = args[1];

// Token type identifiers
const TokenType = {
  LEFT_PAREN: "LEFT_PAREN",
  RIGHT_PAREN: "RIGHT_PAREN",
  LEFT_BRACE: "LEFT_BRACE",
  RIGHT_BRACE: "RIGHT_BRACE",
  COMMA: "COMMA",
  DOT: "DOT",
  MINUS: "MINUS",
  PLUS: "PLUS",
  SEMICOLON: "SEMICOLON",
  STAR: "STAR",
  SLASH: "SLASH",
  EQUAL: "EQUAL",
  EQUAL_EQUAL: "EQUAL_EQUAL",
  BANG: "BANG",
  BANG_EQUAL: "BANG_EQUAL",
  LESS: "LESS",
  LESS_EQUAL: "LESS_EQUAL",
  GREATER: "GREATER",
  GREATER_EQUAL: "GREATER_EQUAL",
  STRING: "STRING",
  NUMBER: "NUMBER",
  IDENTIFIER: "IDENTIFIER",
  AND: "AND",
  CLASS: "CLASS",
  ELSE: "ELSE",
  FALSE: "FALSE",
  FOR: "FOR",
  FUN: "FUN",
  IF: "IF",
  NIL: "NIL",
  OR: "OR",
  PRINT: "PRINT",
  RETURN: "RETURN",
  SUPER: "SUPER",
  THIS: "THIS",
  TRUE: "TRUE",
  VAR: "VAR",
  WHILE: "WHILE",
  EOF: "EOF",
};

// Reserved words
const keywords = {
  and: TokenType.AND,
  class: TokenType.CLASS,
  else: TokenType.ELSE,
  false: TokenType.FALSE,
  for: TokenType.FOR,
  fun: TokenType.FUN,
  if: TokenType.IF,
  nil: TokenType.NIL,
  or: TokenType.OR,
  print: TokenType.PRINT,
  return: TokenType.RETURN,
  super: TokenType.SUPER,
  this: TokenType.THIS,
  true: TokenType.TRUE,
  var: TokenType.VAR,
  while: TokenType.WHILE,
};

class Token {
  constructor(type, lexeme, literal, line) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  toString() {
    let literal = this.literal;
    if (typeof literal === "number") {
      literal = Number.isInteger(literal) ? literal.toFixed(1) : String(literal);
    }
    return `${this.type} ${this.lexeme} ${literal}`;
  }
}

class Scanner {
  constructor(source) {
    this.source = source;
    this.tokens = [];
    this.start = 0;
    this.current = 0;
    this.line = 1;
    this.hadError = false;
  }

  scanTokens() {
    while (!this.isAtEnd()) {
      // We are at the beginning of the next lexeme.
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, "", null, this.line));
    return this.tokens;
  }

  isAtEnd() {
    return this.current >= this.source.length;
  }

  scanToken() {
    const c = this.advance();
    switch (c) {
      case "(":
        this.addToken(TokenType.LEFT_PAREN);
        break;
      case ")":
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      case "{":
        this.addToken(TokenType.LEFT_BRACE);
        break;
      case "}":
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      case ",":
        this.addToken(TokenType.COMMA);
        break;
      case ".":
        this.addToken(TokenType.DOT);
        break;
      case "-":
        this.addToken(TokenType.MINUS);
        break;
      case "+":
        this.addToken(TokenType.PLUS);
        break;
      case ";":
        this.addToken(TokenType.SEMICOLON);
        break;
      case "*":
        this.addToken(TokenType.STAR);
        break;
      case "/":
        if (this.match("/")) {
          // A comment goes until the end of the line.
          while (this.peek() !== "\n" && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;
      case "=":
        if (this.match("=")) {
          this.addToken(TokenType.EQUAL_EQUAL);
        } else {
          this.addToken(TokenType.EQUAL);
        }
        break;
      case "!":
        if (this.match("=")) {
          this.addToken(TokenType.BANG_EQUAL);
        } else {
          this.addToken(TokenType.BANG);
        }
        break;
      case "<":
        if (this.match("=")) {
          this.addToken(TokenType.LESS_EQUAL);
        } else {
          this.addToken(TokenType.LESS);
        }
        break;
      case ">":
        if (this.match("=")) {
          this.addToken(TokenType.GREATER_EQUAL);
        } else {
          this.addToken(TokenType.GREATER);
        }
        break;
      case '"':
        this.string();
        break;
      case " ":
      case "\r":
      case "\t":
        // Ignore whitespace.
        break;
      case "\n":
        this.line++;
        break;
      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          this.reportError(`Unexpected character: ${c}`);
        }
    }
  }

  reportError(message) {
    console.error(`[line ${this.line}] Error: ${message}`);
    this.hadError = true;
  }

  advance() {
    this.current++;
    return this.source.charAt(this.current - 1);
  }

  match(expected) {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) !== expected) return false;

    this.current++;
    return true;
  }

  peek() {
    if (this.isAtEnd()) return "\0";
    return this.source.charAt(this.current);
  }

  string() {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === "\n") this.line++;
      this.advance();
    }

    if (this.isAtEnd()) {
      this.reportError("Unterminated string.");
      return;
    }

    // The closing ".
    this.advance();

    // Trim the surrounding quotes.
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.addToken(TokenType.STRING, value);
  }

  number() {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Look for a fractional part.
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      // Consume the ".".
      this.advance();

      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const text = this.source.substring(this.start, this.current);
    this.addToken(TokenType.NUMBER, parseFloat(text));
  }

  isDigit(c) {
    return c >= "0" && c <= "9";
  }

  identifier() {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.substring(this.start, this.current);
    const type = keywords[text] ?? TokenType.IDENTIFIER;
    this.addToken(type);
  }

  isAlpha(c) {
    return (
      (c >= "a" && c <= "z") ||
      (c >= "A" && c <= "Z") ||
      c === "_"
    );
  }

  isAlphaNumeric(c) {
    return this.isAlpha(c) || this.isDigit(c);
  }

  peekNext() {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source.charAt(this.current + 1);
  }

  addToken(type, literal = null) {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }
}

// Expression AST nodes
class Expr {}

class Literal extends Expr {
  constructor(value) {
    super();
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitLiteralExpr(this);
  }
}

class Grouping extends Expr {
  constructor(expression) {
    super();
    this.expression = expression;
  }

  accept(visitor) {
    return visitor.visitGroupingExpr(this);
  }
}

class Unary extends Expr {
  constructor(operator, right) {
    super();
    this.operator = operator;
    this.right = right;
  }

  accept(visitor) {
    return visitor.visitUnaryExpr(this);
  }
}

class Binary extends Expr {
  constructor(left, operator, right) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept(visitor) {
    return visitor.visitBinaryExpr(this);
  }
}

class Variable extends Expr {
  constructor(name) {
    super();
    this.name = name;
  }

  accept(visitor) {
    return visitor.visitVariableExpr(this);
  }
}

class Assign extends Expr {
  constructor(name, value) {
    super();
    this.name = name;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitAssignExpr(this);
  }
}

class Logical extends Expr {
  constructor(left, operator, right) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept(visitor) {
    return visitor.visitLogicalExpr(this);
  }
}

class Call extends Expr {
  constructor(callee, paren, args) {
    super();
    this.callee = callee;
    this.paren = paren;
    this.args = args;
  }

  accept(visitor) {
    return visitor.visitCallExpr(this);
  }
}

class This extends Expr {
  constructor(keyword) {
    super();
    this.keyword = keyword;
  }

  accept(visitor) {
    return visitor.visitThisExpr(this);
  }
}

class Get extends Expr {
  constructor(object, name) {
    super();
    this.object = object;
    this.name = name;
  }

  accept(visitor) {
    return visitor.visitGetExpr(this);
  }
}

class Set extends Expr {
  constructor(object, name, value) {
    super();
    this.object = object;
    this.name = name;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitSetExpr(this);
  }
}

// Statement AST nodes
class Stmt {}

class ExpressionStmt extends Stmt {
  constructor(expression) {
    super();
    this.expression = expression;
  }

  accept(visitor) {
    return visitor.visitExpressionStmt(this);
  }
}

class PrintStmt extends Stmt {
  constructor(expression) {
    super();
    this.expression = expression;
  }

  accept(visitor) {
    return visitor.visitPrintStmt(this);
  }
}

class VarStmt extends Stmt {
  constructor(name, initializer) {
    super();
    this.name = name;
    this.initializer = initializer;
  }

  accept(visitor) {
    return visitor.visitVarStmt(this);
  }
}

class BlockStmt extends Stmt {
  constructor(statements) {
    super();
    this.statements = statements;
  }

  accept(visitor) {
    return visitor.visitBlockStmt(this);
  }
}

class IfStmt extends Stmt {
  constructor(condition, thenBranch, elseBranch) {
    super();
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }

  accept(visitor) {
    return visitor.visitIfStmt(this);
  }
}

class WhileStmt extends Stmt {
  constructor(condition, body) {
    super();
    this.condition = condition;
    this.body = body;
  }

  accept(visitor) {
    return visitor.visitWhileStmt(this);
  }
}

class FunctionStmt extends Stmt {
  constructor(name, params, body) {
    super();
    this.name = name;
    this.params = params;
    this.body = body;
  }

  accept(visitor) {
    return visitor.visitFunctionStmt(this);
  }
}

class ReturnStmt extends Stmt {
  constructor(keyword, value) {
    super();
    this.keyword = keyword;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitReturnStmt(this);
  }
}

class ClassStmt extends Stmt {
  constructor(name, superclass, methods) {
    super();
    this.name = name;
    this.superclass = superclass;
    this.methods = methods;
  }

  accept(visitor) {
    return visitor.visitClassStmt(this);
  }
}

let hadError = false;
let hadRuntimeError = false;

function report(line, where, message) {
  console.error(`[line ${line}] Error${where}: ${message}`);
  hadError = true;
}

function loxError(token, message) {
  if (token.type === TokenType.EOF) {
    report(token.line, " at end", message);
  } else {
    report(token.line, ` at '${token.lexeme}'`, message);
  }
}

function runtimeError(error) {
  console.error(error.message);
  console.error(`[line ${error.token.line}]`);
  hadRuntimeError = true;
}

class ParseError extends Error {}

class Environment {
  constructor(enclosing = null) {
    this.values = new Map();
    this.enclosing = enclosing;
  }

  define(name, value) {
    this.values.set(name, value);
  }

  get(name) {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme);
    }

    if (this.enclosing !== null) {
      return this.enclosing.get(name);
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }

  assign(name, value) {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }

    if (this.enclosing !== null) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }

  ancestor(distance) {
    let environment = this;
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing;
    }
    return environment;
  }

  getAt(distance, name) {
    return this.ancestor(distance).values.get(name);
  }

  assignAt(distance, name, value) {
    this.ancestor(distance).values.set(name.lexeme, value);
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
  }

  parse() {
    const statements = [];
    while (!this.isAtEnd()) {
      const stmt = this.declaration();
      if (stmt !== null) {
        statements.push(stmt);
      }
    }
    return statements;
  }

  parseExpression() {
    try {
      return this.expression();
    } catch (error) {
      if (error instanceof ParseError) return null;
      throw error;
    }
  }

  declaration() {
    try {
      if (this.match(TokenType.CLASS)) return this.classDeclaration();
      if (this.match(TokenType.FUN)) return this.function("function");
      if (this.match(TokenType.VAR)) return this.varDeclaration();
      return this.statement();
    } catch (error) {
      if (error instanceof ParseError) {
        this.synchronize();
        return null;
      }
      throw error;
    }
  }

  function(kind) {
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${kind} name.`);
    const parameters = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 parameters.");
        }

        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameter name.")
        );
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");

    this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);
    const body = this.block();
    return new FunctionStmt(name, parameters, body);
  }

  classDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, "Expect class name.");

    let superclass = null;
    if (this.match(TokenType.LESS)) {
      this.consume(TokenType.IDENTIFIER, "Expect superclass name.");
      superclass = new Variable(this.previous());
    }

    this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

    const methods = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.function("method"));
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");

    return new ClassStmt(name, superclass, methods);
  }

  statement() {
    if (this.match(TokenType.PRINT)) return this.printStatement();
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.block());
    return this.expressionStatement();
  }

  ifStatement() {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");

    const thenBranch = this.statement();
    let elseBranch = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }

    return new IfStmt(condition, thenBranch, elseBranch);
  }

  whileStatement() {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
    const body = this.statement();

    return new WhileStmt(condition, body);
  }

  forStatement() {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");

    let initializer = null;
    if (this.match(TokenType.SEMICOLON)) {
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

    let increment = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.");

    let body = this.statement();

    if (increment !== null) {
      body = new BlockStmt([body, new ExpressionStmt(increment)]);
    }

    if (condition === null) condition = new Literal(true);
    body = new WhileStmt(condition, body);

    if (initializer !== null) {
      body = new BlockStmt([initializer, body]);
    }

    return body;
  }

  block() {
    const statements = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const stmt = this.declaration();
      if (stmt !== null) {
        statements.push(stmt);
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
    return statements;
  }

  printStatement() {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new PrintStmt(value);
  }

  returnStatement() {
    const keyword = this.previous();
    let value = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return new ReturnStmt(keyword, value);
  }

  varDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");

    let initializer = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return new VarStmt(name, initializer);
  }

  expressionStatement() {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new ExpressionStmt(expr);
  }

  synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  expression() {
    return this.assignment();
  }

  assignment() {
    const expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Variable) {
        const name = expr.name;
        return new Assign(name, value);
      } else if (expr instanceof Get) {
        const get = expr;
        return new Set(get.object, get.name, value);
      }

      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  or() {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  and() {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  equality() {
    let expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  comparison() {
    let expr = this.term();

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL
      )
    ) {
      const operator = this.previous();
      const right = this.term();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  term() {
    let expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  factor() {
    let expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  unary() {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Unary(operator, right);
    }

    return this.call();
  }

  call() {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(
          TokenType.IDENTIFIER,
          "Expect property name after '.'."
        );
        expr = new Get(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  finishCall(callee) {
    const args = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    const paren = this.consume(
      TokenType.RIGHT_PAREN,
      "Expect ')' after arguments."
    );

    return new Call(callee, paren, args);
  }

  primary() {
    if (this.match(TokenType.FALSE)) return new Literal(false);
    if (this.match(TokenType.TRUE)) return new Literal(true);
    if (this.match(TokenType.NIL)) return new Literal(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Literal(this.previous().literal);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new Variable(this.previous());
    }

    if (this.match(TokenType.THIS)) return new This(this.previous());

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new Grouping(expr);
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  error(token, message) {
    loxError(token, message);
    return new ParseError();
  }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  consume(type, message) {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  peek() {
    return this.tokens[this.current];
  }

  previous() {
    return this.tokens[this.current - 1];
  }
}

class AstPrinter {
  print(expr) {
    return expr.accept(this);
  }

  visitLiteralExpr(expr) {
    if (expr.value === null) return "nil";
    if (typeof expr.value === "number") {
      return Number.isInteger(expr.value)
        ? expr.value.toFixed(1)
        : String(expr.value);
    }
    return String(expr.value);
  }

  visitGroupingExpr(expr) {
    return this.parenthesize("group", expr.expression);
  }

  visitUnaryExpr(expr) {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  visitBinaryExpr(expr) {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitVariableExpr(expr) {
    return expr.name.lexeme;
  }

  visitAssignExpr(expr) {
    return this.parenthesize("=", new Variable(expr.name), expr.value);
  }

  visitLogicalExpr(expr) {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitCallExpr(expr) {
    return this.parenthesize("call", expr.callee, ...expr.args);
  }

  visitThisExpr(expr) {
    return "this";
  }

  visitGetExpr(expr) {
    return this.parenthesize(".", expr.object, new Literal(expr.name.lexeme));
  }

  visitSetExpr(expr) {
    return this.parenthesize(
      "=",
      expr.object,
      new Literal(expr.name.lexeme),
      expr.value
    );
  }

  parenthesize(name, ...exprs) {
    let builder = `(${name}`;
    for (const expr of exprs) {
      builder += ` ${expr.accept(this)}`;
    }
    builder += ")";
    return builder;
  }
}

class RuntimeError extends Error {
  constructor(token, message) {
    super(message);
    this.token = token;
  }
}

class Return extends Error {
  constructor(value) {
    super();
    this.value = value;
  }
}

class LoxCallable {
  arity() {
    throw new Error("Not implemented");
  }

  call(interpreter, args) {
    throw new Error("Not implemented");
  }
}

class Clock extends LoxCallable {
  arity() {
    return 0;
  }

  call(interpreter, args) {
    return Date.now() / 1000.0;
  }

  toString() {
    return "<native fn>";
  }
}

class LoxFunction extends LoxCallable {
  constructor(declaration, closure, isInitializer) {
    super();
    this.declaration = declaration;
    this.closure = closure;
    this.isInitializer = isInitializer;
  }

  arity() {
    return this.declaration.params.length;
  }

  call(interpreter, args) {
    const environment = new Environment(this.closure);
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (returnValue) {
      if (returnValue instanceof Return) {
        return this.isInitializer
          ? this.closure.getAt(0, "this")
          : returnValue.value;
      }
      throw returnValue;
    }
    return this.isInitializer ? this.closure.getAt(0, "this") : null;
  }

  bind(instance) {
    const environment = new Environment(this.closure);
    environment.define("this", instance);
    return new LoxFunction(this.declaration, environment, this.isInitializer);
  }

  toString() {
    return `<fn ${this.declaration.name.lexeme}>`;
  }
}

class LoxClass extends LoxCallable {
  constructor(name, superclass, methods) {
    super();
    this.name = name;
    this.superclass = superclass;
    this.methods = methods;
  }

  findMethod(name) {
    if (this.methods.has(name)) {
      return this.methods.get(name);
    }

    if (this.superclass !== null) {
      return this.superclass.findMethod(name);
    }

    return null;
  }

  arity() {
    const initializer = this.findMethod("init");
    if (initializer !== null) return initializer.arity();
    return 0;
  }

  call(interpreter, args) {
    const instance = new LoxInstance(this);
    const initializer = this.findMethod("init");
    if (initializer !== null) {
      initializer.bind(instance).call(interpreter, args);
    }
    return instance;
  }

  toString() {
    return this.name;
  }
}

class LoxInstance {
  constructor(klass) {
    this.klass = klass;
    this.fields = new Map();
  }

  get(name) {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const method = this.klass.findMethod(name.lexeme);
    if (method !== null) {
      return method.bind(this);
    }

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name, value) {
    this.fields.set(name.lexeme, value);
  }

  toString() {
    return `${this.klass.name} instance`;
  }
}

class Interpreter {
  constructor() {
    this.globals = new Environment();
    this.globals.define("clock", new Clock());
    this.environment = this.globals;
    this.locals = new Map();
  }

  interpret(statements) {
    for (const statement of statements) {
      this.execute(statement);
    }
  }

  interpretExpression(expression) {
    const value = this.evaluate(expression);
    return this.stringify(value);
  }

  execute(stmt) {
    stmt.accept(this);
  }

  visitExpressionStmt(stmt) {
    this.evaluate(stmt.expression);
    return null;
  }

  visitPrintStmt(stmt) {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
    return null;
  }

  visitVarStmt(stmt) {
    let value = null;
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
    return null;
  }

  visitFunctionStmt(stmt) {
    const fn = new LoxFunction(stmt, this.environment);
    this.environment.define(stmt.name.lexeme, fn);
    return null;
  }

  visitClassStmt(stmt) {
    let superclass = null;
    if (stmt.superclass !== null) {
      superclass = this.evaluate(stmt.superclass);
      if (!(superclass instanceof LoxClass)) {
        throw new RuntimeError(
          stmt.superclass.name,
          "Superclass must be a class."
        );
      }
    }

    this.environment.define(stmt.name.lexeme, null);

    if (stmt.superclass !== null) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superclass);
    }

    const methods = new Map();
    for (const method of stmt.methods) {
      const fn = new LoxFunction(
        method,
        this.environment,
        method.name.lexeme === "init"
      );
      methods.set(method.name.lexeme, fn);
    }

    const klass = new LoxClass(stmt.name.lexeme, superclass, methods);

    if (superclass !== null) {
      this.environment = this.environment.enclosing;
    }

    this.environment.assign(stmt.name, klass);
    return null;
  }

  visitReturnStmt(stmt) {
    let value = null;
    if (stmt.value !== null) value = this.evaluate(stmt.value);

    throw new Return(value);
  }

  visitBlockStmt(stmt) {
    this.executeBlock(stmt.statements, new Environment(this.environment));
    return null;
  }

  visitIfStmt(stmt) {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }
    return null;
  }

  visitWhileStmt(stmt) {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
    return null;
  }

  executeBlock(statements, environment) {
    const previous = this.environment;
    try {
      this.environment = environment;

      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }

  evaluate(expr) {
    return expr.accept(this);
  }

  visitLiteralExpr(expr) {
    return expr.value;
  }

  visitVariableExpr(expr) {
    return this.lookUpVariable(expr.name, expr);
  }

  visitThisExpr(expr) {
    return this.lookUpVariable(expr.keyword, expr);
  }

  visitGetExpr(expr) {
    const object = this.evaluate(expr.object);
    if (object instanceof LoxInstance) {
      return object.get(expr.name);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  visitSetExpr(expr) {
    const object = this.evaluate(expr.object);

    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields.");
    }

    const value = this.evaluate(expr.value);
    object.set(expr.name, value);
    return value;
  }

  visitAssignExpr(expr) {
    const value = this.evaluate(expr.value);

    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }

    return value;
  }

  resolve(expr, depth) {
    this.locals.set(expr, depth);
  }

  lookUpVariable(name, expr) {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }

  visitGroupingExpr(expr) {
    return this.evaluate(expr.expression);
  }

  visitUnaryExpr(expr) {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return -right;
    }

    // Unreachable.
    return null;
  }

  visitBinaryExpr(expr) {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
        return left - right;
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);
        return left / right;
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return left * right;
      case TokenType.PLUS:
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }
        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }
        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings."
        );
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return left > right;
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return left >= right;
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return left < right;
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return left <= right;
      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);
    }

    // Unreachable.
    return null;
  }

  visitLogicalExpr(expr) {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitCallExpr(expr) {
    const callee = this.evaluate(expr.callee);

    const args = [];
    for (const arg of expr.args) {
      args.push(this.evaluate(arg));
    }

    if (!(callee instanceof LoxCallable)) {
      throw new RuntimeError(expr.paren, "Can only call functions and classes.");
    }

    const fn = callee;
    if (args.length !== fn.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${fn.arity()} arguments but got ${args.length}.`
      );
    }

    return fn.call(this, args);
  }

  isTruthy(object) {
    if (object === null) return false;
    if (typeof object === "boolean") return object;
    return true;
  }

  isEqual(a, b) {
    if (a === null && b === null) return true;
    if (a === null) return false;
    return a === b;
  }

  checkNumberOperand(operator, operand) {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  checkNumberOperands(operator, left, right) {
    if (typeof left === "number" && typeof right === "number") return;
    throw new RuntimeError(operator, "Operands must be numbers.");
  }

  stringify(object) {
    if (object === null) return "nil";

    if (typeof object === "number") {
      let text = String(object);
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }
      return text;
    }

    return String(object);
  }
}

class Resolver {
  constructor(interpreter) {
    this.interpreter = interpreter;
    this.scopes = [];
    this.currentFunction = "NONE";
    this.currentClass = "NONE";
  }

  resolve(statements) {
    for (const statement of statements) {
      this.resolveStmt(statement);
    }
  }

  resolveStmt(stmt) {
    stmt.accept(this);
  }

  resolveExpr(expr) {
    expr.accept(this);
  }

  visitBlockStmt(stmt) {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
    return null;
  }

  visitVarStmt(stmt) {
    this.declare(stmt.name);
    if (stmt.initializer !== null) {
      this.resolveExpr(stmt.initializer);
    }
    this.define(stmt.name);
    return null;
  }

  visitFunctionStmt(stmt) {
    this.declare(stmt.name);
    this.define(stmt.name);

    this.resolveFunction(stmt, "FUNCTION");
    return null;
  }

  visitClassStmt(stmt) {
    const enclosingClass = this.currentClass;
    this.currentClass = "CLASS";

    this.declare(stmt.name);
    this.define(stmt.name);

    if (
      stmt.superclass !== null &&
      stmt.name.lexeme === stmt.superclass.name.lexeme
    ) {
      loxError(stmt.superclass.name, "A class can't inherit from itself.");
    }

    if (stmt.superclass !== null) {
      this.resolveExpr(stmt.superclass);
    }

    if (stmt.superclass !== null) {
      this.beginScope();
      this.scopes[this.scopes.length - 1].set("super", true);
    }

    this.beginScope();
    this.scopes[this.scopes.length - 1].set("this", true);

    for (const method of stmt.methods) {
      const declaration =
        method.name.lexeme === "init" ? "INITIALIZER" : "METHOD";
      this.resolveFunction(method, declaration);
    }

    this.endScope();

    if (stmt.superclass !== null) this.endScope();

    this.currentClass = enclosingClass;
    return null;
  }

  visitExpressionStmt(stmt) {
    this.resolveExpr(stmt.expression);
    return null;
  }

  visitIfStmt(stmt) {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.thenBranch);
    if (stmt.elseBranch !== null) this.resolveStmt(stmt.elseBranch);
    return null;
  }

  visitPrintStmt(stmt) {
    this.resolveExpr(stmt.expression);
    return null;
  }

  visitReturnStmt(stmt) {
    if (this.currentFunction === "NONE") {
      loxError(stmt.keyword, "Can't return from top-level code.");
    }

    if (this.currentFunction === "INITIALIZER" && stmt.value !== null) {
      loxError(stmt.keyword, "Can't return a value from an initializer.");
    }

    if (stmt.value !== null) {
      this.resolveExpr(stmt.value);
    }

    return null;
  }

  visitWhileStmt(stmt) {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.body);
    return null;
  }

  visitVariableExpr(expr) {
    if (
      this.scopes.length !== 0 &&
      this.scopes[this.scopes.length - 1].get(expr.name.lexeme) === false
    ) {
      loxError(expr.name, "Can't read local variable in its own initializer.");
    }

    this.resolveLocal(expr, expr.name);
    return null;
  }

  visitThisExpr(expr) {
    if (this.currentClass === "NONE") {
      loxError(expr.keyword, "Can't use 'this' outside of a class.");
      return null;
    }

    this.resolveLocal(expr, expr.keyword);
    return null;
  }

  visitGetExpr(expr) {
    this.resolveExpr(expr.object);
    return null;
  }

  visitSetExpr(expr) {
    this.resolveExpr(expr.value);
    this.resolveExpr(expr.object);
    return null;
  }

  visitAssignExpr(expr) {
    this.resolveExpr(expr.value);
    this.resolveLocal(expr, expr.name);
    return null;
  }

  visitBinaryExpr(expr) {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
    return null;
  }

  visitCallExpr(expr) {
    this.resolveExpr(expr.callee);

    for (const argument of expr.args) {
      this.resolveExpr(argument);
    }

    return null;
  }

  visitGroupingExpr(expr) {
    this.resolveExpr(expr.expression);
    return null;
  }

  visitLiteralExpr(expr) {
    return null;
  }

  visitLogicalExpr(expr) {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
    return null;
  }

  visitUnaryExpr(expr) {
    this.resolveExpr(expr.right);
    return null;
  }

  resolveFunction(fn, type) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    this.beginScope();
    for (const param of fn.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(fn.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  beginScope() {
    this.scopes.push(new Map());
  }

  endScope() {
    this.scopes.pop();
  }

  declare(name) {
    if (this.scopes.length === 0) return;

    const scope = this.scopes[this.scopes.length - 1];
    if (scope.has(name.lexeme)) {
      loxError(name, "Already a variable with this name in this scope.");
    }

    scope.set(name.lexeme, false);
  }

  define(name) {
    if (this.scopes.length === 0) return;
    this.scopes[this.scopes.length - 1].set(name.lexeme, true);
  }

  resolveLocal(expr, name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }

    // Not found. Assume it is global.
  }
}

if (command === "tokenize") {
  const fileContent = fs.readFileSync(filename, "utf8");
  const scanner = new Scanner(fileContent);
  const tokens = scanner.scanTokens();

  for (const token of tokens) {
    console.log(token.toString());
  }

  if (scanner.hadError) {
    process.exit(65);
  }
} else if (command === "parse") {
  const fileContent = fs.readFileSync(filename, "utf8");
  const scanner = new Scanner(fileContent);
  const tokens = scanner.scanTokens();
  const parser = new Parser(tokens);
  const expression = parser.parseExpression();

  if (hadError) {
    process.exit(65);
  }

  const printer = new AstPrinter();
  console.log(printer.print(expression));
} else if (command === "evaluate") {
  const fileContent = fs.readFileSync(filename, "utf8");
  const scanner = new Scanner(fileContent);
  const tokens = scanner.scanTokens();
  const parser = new Parser(tokens);
  const expression = parser.parseExpression();

  if (hadError) {
    process.exit(65);
  }

  const interpreter = new Interpreter();
  try {
    console.log(interpreter.interpretExpression(expression));
  } catch (error) {
    if (error instanceof RuntimeError) {
      runtimeError(error);
    } else {
      throw error;
    }
  }

  if (hadRuntimeError) {
    process.exit(70);
  }
} else if (command === "run") {
  const fileContent = fs.readFileSync(filename, "utf8");
  const scanner = new Scanner(fileContent);
  const tokens = scanner.scanTokens();
  const parser = new Parser(tokens);

  let statements = [];
  try {
    statements = parser.parse();
  } catch (error) {
    if (!(error instanceof ParseError)) throw error;
  }

  if (hadError) {
    process.exit(65);
  }

  const interpreter = new Interpreter();
  const resolver = new Resolver(interpreter);
  resolver.resolve(statements);

  if (hadError) {
    process.exit(65);
  }

  try {
    interpreter.interpret(statements);
  } catch (error) {
    if (error instanceof RuntimeError) {
      runtimeError(error);
    } else {
      throw error;
    }
  }

  if (hadRuntimeError) {
    process.exit(70);
  }
} else {
  console.error(`Usage: Unknown command: ${command}`);
  process.exit(1);
}
