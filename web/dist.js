(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Egua = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process){
const Lexer = require("./lexer.js");
const Parser = require("./parser.js");
const Resolver = require("./resolver.js");
const Interpreter = require("./interpreter.js");
const tokenTypes = require("./tokenTypes.js");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

module.exports.Egua = class Egua {
    constructor(filename) {
        this.filename = filename;

        this.hadError = false;
        this.hadRuntimeError = false;
    }

    runPrompt() {
        const interpreter = new Interpreter(this, process.cwd(), undefined);
        console.log("Console da Linguagem Egua v1.0.4");
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "\negua> "
        });

        rl.prompt();

        rl.on("line", line => {
            this.hadError = false;
            this.hadRuntimeError = false;

            this.run(line, interpreter);
            rl.prompt();
        });
    }

    runfile(filename) {
        this.filename = path.basename(filename);
        const interpreter = new Interpreter(this, process.cwd());

        const fileData = fs.readFileSync(filename).toString();
        this.run(fileData, interpreter);

        if (this.hadError) process.exit(65);
        if (this.hadRuntimeError) process.exit(70);
    }

    run(code, interpreter) {
        const lexer = new Lexer(code, this);
        const tokens = lexer.scan();

        if (this.hadError === true) return;

        const parser = new Parser(tokens, this);
        const statements = parser.parse();

        if (this.hadError === true) return;

        const resolver = new Resolver(interpreter, this);
        resolver.resolve(statements);

        if (this.hadError === true) return;

        interpreter.interpret(statements);
    }

    report(line, where, message) {
        if (this.filename)
            console.error(
                `[Arquivo: ${this.filename}] [Linha: ${line}] Erro${where}: ${message}`
            );
        else console.error(`[Linha: ${line}] Erro${where}: ${message}`);
        this.hadError = true;
    }

    error(token, errorMessage) {
        if (token.type === tokenTypes.EOF) {
            this.report(token.line, " no final", errorMessage);
        } else {
            this.report(token.line, ` no '${token.lexeme}'`, errorMessage);
        }
    }

    lexerError(line, char, msg) {
        this.report(line, ` no '${char}'`, msg);
    }

    runtimeError(error) {
        let line = error.token.line;
        if (error.token && line) {
            if (this.fileName)
                console.error(
                    `Erro: [Arquivo: ${this.fileName}] [Linha: ${error.token.line}] ${error.message}`
                );
            else console.error(`Erro: [Linha: ${error.token.line}] ${error.message}`);
        } else {
            console.error(error);
        }
        this.hadRuntimeError = true;
    }
};
}).call(this,require('_process'))
},{"./interpreter.js":5,"./lexer.js":6,"./parser.js":11,"./resolver.js":12,"./tokenTypes.js":20,"_process":24,"fs":22,"path":23,"readline":22}],2:[function(require,module,exports){
const RuntimeError = require("./errors.js").RuntimeError;

module.exports = class Environment {
    constructor(enclosing) {
        this.enclosing = enclosing || null;
        this.values = {};
    }

    defineVar(varName, value) {
        this.values[varName] = value;
    }

    assignVarAt(distance, name, value) {
        this.ancestor(distance).values[name.lexeme] = value;
    }

    assignVar(name, value) {
        if (this.values[name.lexeme] !== undefined) {
            this.values[name.lexeme] = value;
            return;
        }

        if (this.enclosing != null) {
            this.enclosing.assignVar(name, value);
            return;
        }

        throw new RuntimeError(name, "Variável não definida '" + name.lexeme + "'.");
    }

    ancestor(distance) {
        let environment = this;
        for (let i = 0; i < distance; i++) {
            environment = environment.enclosing;
        }

        return environment;
    }

    getVarAt(distance, name) {
        return this.ancestor(distance).values[name];
    }

    getVar(token) {
        if (this.values[token.lexeme] !== undefined) {
            return this.values[token.lexeme];
        }

        if (this.enclosing !== null) return this.enclosing.getVar(token);

        throw new RuntimeError(token, "Variável não definida '" + token.lexeme + "'.");
    }
};
},{"./errors.js":3}],3:[function(require,module,exports){
module.exports.RuntimeError = class RuntimeError extends Error {
  constructor(token, message) {
    super(message);
    this.token = token;
  }
};

module.exports.ContinueException = class ContinueException extends Error { };

module.exports.BreakException = class BreakException extends Error { };

module.exports.ReturnException = class ReturnException extends Error {
  constructor(value) {
    super(value);
    this.value = value;
  }
};
},{}],4:[function(require,module,exports){
class Expr {
    accept(visitor) {}
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

class Funcao extends Expr {
    constructor(params, body) {
        super();
        this.params = params;
        this.body = body;
    }

    accept(visitor) {
        return visitor.visitFunctionExpr(this);
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

class Grouping extends Expr {
    constructor(expression) {
        super();
        this.expression = expression;
    }

    accept(visitor) {
        return visitor.visitGroupingExpr(this);
    }
}

class Literal extends Expr {
    constructor(value) {
        super();
        this.value = value;
    }

    accept(visitor) {
        return visitor.visitLiteralExpr(this);
    }
}

class Array extends Expr {
    constructor(values) {
        super();
        this.values = values;
    }

    accept(visitor) {
        return visitor.visitArrayExpr(this);
    }
}

class Dictionary extends Expr {
    constructor(keys, values) {
        super();
        this.keys = keys;
        this.values = values;
    }

    accept(visitor) {
        return visitor.visitDictionaryExpr(this);
    }
}

class Subscript extends Expr {
    constructor(callee, index, closeBracket) {
        super();
        this.callee = callee;
        this.index = index;
        this.closeBracket = closeBracket;
    }

    accept(visitor) {
        return visitor.visitSubscriptExpr(this);
    }
}

class Assignsubscript extends Expr {
    constructor(obj, index, value) {
        super();
        this.obj = obj;
        this.index = index;
        this.value = value;
    }

    accept(visitor) {
        return visitor.visitAssignsubscriptExpr(this);
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

class Super extends Expr {
    constructor(keyword, method) {
        super();
        this.keyword = keyword;
        this.method = method;
    }

    accept(visitor) {
        return visitor.visitSuperExpr(this);
    }
}

class Isto extends Expr {
    constructor(keyword) {
        super();
        this.keyword = keyword;
    }

    accept(visitor) {
        return visitor.visitThisExpr(this);
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

class Variable extends Expr {
    constructor(name) {
        super();
        this.name = name;
    }

    accept(visitor) {
        return visitor.visitVariableExpr(this);
    }
}

module.exports = {
    Assign,
    Binary,
    Funcao,
    Call,
    Get,
    Grouping,
    Literal,
    Array,
    Dictionary,
    Subscript,
    Assignsubscript,
    Logical,
    Set,
    Super,
    Isto,
    Unary,
    Variable
};
},{}],5:[function(require,module,exports){
const tokenTypes = require("./tokenTypes.js");
const Environment = require("./environment.js");
const Egua = require("./egua.js");
const loadGlobalLib = require("./lib/globalLib.js");
const path = require("path");
const fs = require("fs");
const checkStdLib = require("./lib/importStdlib.js");

const Callable = require("./structures/callable.js");
const StandardFn = require("./structures/standardFn.js");
const EguaClass = require("./structures/class.js");
const EguaFunction = require("./structures/function.js");
const EguaInstance = require("./structures/instance.js");
const EguaModule = require("./structures/module.js");

const {
    RuntimeError,
    ContinueException,
    BreakException,
    ReturnException
} = require("./errors.js");

module.exports = class Interpreter {
    constructor(Egua, baseDir) {
        this.Egua = Egua;
        this.baseDir = baseDir;

        this.globals = new Environment();
        this.environment = this.globals;
        this.locals = new Map();

        this.globals = loadGlobalLib(this.globals);
    }

    resolve(expr, depth) {
        this.locals.set(expr, depth);
    }

    visitLiteralExpr(expr) {
        return expr.value;
    }

    evaluate(expr) {
        return expr.accept(this);
    }

    visitGroupingExpr(expr) {
        return this.evaluate(expr.expression);
    }

    isTruthy(object) {
        if (object === null) return false;
        else if (typeof object === "boolean") return Boolean(object);
        else return true;
    }

    checkNumberOperand(operator, operand) {
        if (typeof operand === "number") return;
        throw new RuntimeError(operator, "Operador precisa ser um número.");
    }

    visitUnaryExpr(expr) {
        let right = this.evaluate(expr.right);

        switch (expr.operator.type) {
            case tokenTypes.MINUS:
                this.checkNumberOperand(expr.operator, right);
                return -right;
            case tokenTypes.BANG:
                return !this.isTruthy(right);
            case tokenTypes.BIT_NOT:
                return ~right;
        }

        return null;
    }

    isEqual(left, right) {
        if (left === null && right === null) return true;
        else if (left === null) return false;

        return left === right;
    }

    checkNumberOperands(operator, left, right) {
        if (typeof left === "number" && typeof right === "number") return;
        throw new RuntimeError(operator, "Operadores precisam ser números.");
    }

    visitBinaryExpr(expr) {
        let left = this.evaluate(expr.left);
        let right = this.evaluate(expr.right);

        switch (expr.operator.type) {
            case tokenTypes.STAR_STAR:
                this.checkNumberOperands(expr.operator, left, right);
                return Math.pow(left, right);

            case tokenTypes.GREATER:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) > Number(right);

            case tokenTypes.GREATER_EQUAL:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) >= Number(right);

            case tokenTypes.LESS:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) < Number(right);

            case tokenTypes.LESS_EQUAL:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) <= Number(right);

            case tokenTypes.MINUS:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) - Number(right);

            case tokenTypes.PLUS:
                if (typeof left === "number" && typeof right === "number") {
                    return Number(left) + Number(right);
                }

                if (typeof left === "string" && typeof right === "string") {
                    return String(left) + String(right);
                }

                throw new RuntimeError(
                    expr.operator,
                    "Operadores precisam ser dois números ou duas strings."
                );

            case tokenTypes.SLASH:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) / Number(right);

            case tokenTypes.STAR:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) * Number(right);

            case tokenTypes.MODULUS:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) % Number(right);

            case tokenTypes.BIT_AND:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) & Number(right);

            case tokenTypes.BIT_XOR:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) ^ Number(right);

            case tokenTypes.BIT_OR:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) | Number(right);

            case tokenTypes.LESSER_LESSER:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) << Number(right);

            case tokenTypes.GREATER_GREATER:
                this.checkNumberOperands(expr.operator, left, right);
                return Number(left) >> Number(right);

            case tokenTypes.BANG_EQUAL:
                return !this.isEqual(left, right);

            case tokenTypes.EQUAL_EQUAL:
                return this.isEqual(left, right);
        }

        return null;
    }

    visitCallExpr(expr) {
        let callee = this.evaluate(expr.callee);

        let args = [];
        for (let i = 0; i < expr.args.length; i++) {
            args.push(this.evaluate(expr.args[i]));
        }

        if (!(callee instanceof Callable)) {
            throw new RuntimeError(
                expr.paren,
                "Só pode chamar função ou classe."
            );
        }

        let params;
        if (callee instanceof EguaFunction) {
            params = callee.declaration.params;
        } else if (callee instanceof EguaClass) {
            params = callee.methods.init
                ? callee.methods.init.declaration.params
                : [];
        } else {
            params = [];
        }

        if (args.length < callee.arity()) {
            let diff = callee.arity() - args.length;
            for (let i = 0; i < diff; i++) {
                args.push(null);
            }
        }

        else if (args.length >= callee.arity()) {
            if (
                params.length > 0 &&
                params[params.length - 1]["type"] === "wildcard"
            ) {
                let newArgs = args.slice(0, params.length - 1);
                newArgs.push(args.slice(params.length - 1, args.length));
                args = newArgs;
            }
        }

        if (callee instanceof StandardFn) {
            return callee.call(this, args, expr.callee.name);
        }

        return callee.call(this, args);
    }

    visitAssignExpr(expr) {
        let value = this.evaluate(expr.value);

        let distance = this.locals.get(expr);
        if (distance !== undefined) {
            this.environment.assignVarAt(distance, expr.name, value);
        } else {
            this.environment.assignVar(expr.name, value);
        }

        return value;
    }

    lookupVar(name, expr) {
        let distance = this.locals.get(expr);
        if (distance !== undefined) {
            return this.environment.getVarAt(distance, name.lexeme);
        } else {
            return this.globals.getVar(name);
        }
    }

    visitVariableExpr(expr) {
        return this.lookupVar(expr.name, expr);
    }

    visitExpressionStmt(stmt) {
        this.evaluate(stmt.expression);
        return null;
    }

    visitLogicalExpr(expr) {
        let left = this.evaluate(expr.left);

        if (expr.operator.type === tokenTypes.EM) {
            let right = this.evaluate(expr.right);

            if (Array.isArray(right) || typeof right === "string") {
                return right.includes(left);
            } else if (right.constructor == Object) {
                return left in right;
            } else {
                throw new RuntimeError("Tipo de chamada inválida com 'em'.");
            }
        }

        // se um estado for verdadeiro, retorna verdadeiro
        if (expr.operator.type === tokenTypes.OU) {
            if (this.isTruthy(left)) return left;
        }

        // se um estado for falso, retorna falso
        if (expr.operator.type === tokenTypes.E) {
            if (!this.isTruthy(left)) return left;
        }

        return this.evaluate(expr.right);
    }

    visitIfStmt(stmt) {
        if (this.isTruthy(this.evaluate(stmt.condition))) {
            this.execute(stmt.thenBranch);
            return null;
        }

        for (let i = 0; i < stmt.elifBranches.length; i++) {
            let current = stmt.elifBranches[i];

            if (this.isTruthy(this.evaluate(current.condition))) {
                this.execute(current.branch);
                return null;
            }
        }

        if (stmt.elseBranch !== null) {
            this.execute(stmt.elseBranch);
        }

        return null;
    }

    visitForStmt(stmt) {
        if (stmt.initializer !== null) {
            this.evaluate(stmt.initializer);
        }
        while (true) {
            if (stmt.condition !== null) {
                if (!this.isTruthy(this.evaluate(stmt.condition))) {
                    break;
                }
            }

            try {
                this.execute(stmt.body);
            } catch (error) {
                if (error instanceof BreakException) {
                    break;
                } else if (error instanceof ContinueException) {
                } else {
                    throw error;
                }
            }

            if (stmt.increment !== null) {
                this.evaluate(stmt.increment);
            }
        }
        return null;
    }

    visitDoStmt(stmt) {
        do {
            try {
                this.execute(stmt.doBranch);
            } catch (error) {
                if (error instanceof BreakException) {
                    break;
                } else if (error instanceof ContinueException) {
                } else {
                    throw error;
                }
            }
        } while (this.isTruthy(this.evaluate(stmt.whileCondition)));
    }

    visitSwitchStmt(stmt) {
        let switchCondition = this.evaluate(stmt.condition);
        let branches = stmt.branches;
        let defaultBranch = stmt.defaultBranch;

        let matched = false;
        try {
            for (let i = 0; i < branches.length; i++) {
                let branch = branches[i];

                for (let j = 0; j < branch.conditions.length; j++) {
                    if (this.evaluate(branch.conditions[j]) === switchCondition) {
                        matched = true;

                        try {
                            for (let k = 0; k < branch.stmts.length; k++) {
                                this.execute(branch.stmts[k]);
                            }
                        } catch (error) {
                            if (error instanceof ContinueException) {
                            } else {
                                throw error;
                            }
                        }
                    }
                }
            }

            if (defaultBranch !== null && matched === false) {
                for (let i = 0; i < defaultBranch.stmts.length; i++) {
                    this.execute(defaultBranch["stmts"][i]);
                }
            }
        } catch (error) {
            if (error instanceof BreakException) {
            } else {
                throw error;
            }
        }
    }

    visitTryStmt(stmt) {
        try {
            let successful = true;
            try {
                this.executeBlock(stmt.tryBranch, new Environment(this.environment));
            } catch (error) {
                successful = false;

                if (stmt.catchBranch !== null) {
                    this.executeBlock(
                        stmt.catchBranch,
                        new Environment(this.environment)
                    );
                }
            }

            if (successful && stmt.elseBranch !== null) {
                this.executeBlock(stmt.elseBranch, new Environment(this.environment));
            }
        } finally {
            if (stmt.finallyBranch !== null)
                this.executeBlock(
                    stmt.finallyBranch,
                    new Environment(this.environment)
                );
        }
    }

    visitWhileStmt(stmt) {
        while (this.isTruthy(this.evaluate(stmt.condition))) {
            try {
                this.execute(stmt.body);
            } catch (error) {
                if (error instanceof BreakException) {
                    break;
                } else if (error instanceof ContinueException) {
                } else {
                    throw error;
                }
            }
        }

        return null;
    }

    visitImportStmt(stmt) {
        let relativePath = this.evaluate(stmt.path);
        let totalPath = path.join(this.baseDir, relativePath);
        let totalFolder = path.dirname(totalPath);
        let filename = path.basename(totalPath);

        let data = checkStdLib(relativePath);
        if (data !== null) return data;

        try {
            if (!fs.existsSync(totalPath)) {
                throw new RuntimeError(
                    stmt.closeBracket,
                    "Não foi possível encontrar arquivo importado."
                );
            }
        } catch (error) {
            throw new RuntimeError(stmt.closeBracket, "Não foi possível ler o arquivo.");
        }

        data = fs.readFileSync(totalPath).toString();

        const egua = new Egua.Egua(filename);
        const interpreter = new Interpreter(egua, totalFolder);

        egua.run(data, interpreter);

        let exported = interpreter.globals.values.exports;

        const isDict = obj => obj.constructor === Object;

        if (isDict(exported)) {
            let newModule = new EguaModule();

            let keys = Object.keys(exported);
            for (let i = 0; i < keys.length; i++) {
                newModule[keys[i]] = exported[keys[i]];
            }

            return newModule;
        }

        return exported;
    }

    visitPrintStmt(stmt) {
        let value = this.evaluate(stmt.expression);
        console.log(this.stringify(value));
        return null;
    }

    executeBlock(statements, environment) {
        let previous = this.environment;
        try {
            this.environment = environment;

            for (let i = 0; i < statements.length; i++) {
                this.execute(statements[i]);
            }
        } finally {
            this.environment = previous;
        }
    }

    visitBlockStmt(stmt) {
        this.executeBlock(stmt.statements, new Environment(this.environment));
        return null;
    }

    visitVarStmt(stmt) {
        let value = null;
        if (stmt.initializer !== null) {
            value = this.evaluate(stmt.initializer);
        }

        this.environment.defineVar(stmt.name.lexeme, value);
        return null;
    }

    visitContinueStmt(stmt) {
        throw new ContinueException();
    }

    visitBreakStmt(stmt) {
        throw new BreakException();
    }

    visitReturnStmt(stmt) {
        let value = null;
        if (stmt.value != null) value = this.evaluate(stmt.value);

        throw new ReturnException(value);
    }

    visitFunctionExpr(expr) {
        return new EguaFunction(null, expr, this.environment, false);
    }

    visitAssignsubscriptExpr(expr) {
        let obj = this.evaluate(expr.obj);
        let index = this.evaluate(expr.index);
        let value = this.evaluate(expr.value);

        if (Array.isArray(obj)) {
            if (index < 0 && obj.length !== 0) {
                while (index < 0) {
                    index += obj.length;
                }
            }

            while (obj.length < index) {
                obj.push(null);
            }

            obj[index] = value;
        } else if (
            obj.constructor == Object ||
            obj instanceof EguaInstance ||
            obj instanceof EguaFunction ||
            obj instanceof EguaClass ||
            obj instanceof EguaModule
        ) {
            obj[index] = value;
        }

        else {
            throw new RuntimeError(
                expr.obj.name,
                "Somente listas, dicionários, classes e objetos podem ser mudados por sobrescrita."
            );
        }
    }

    visitSubscriptExpr(expr) {
        let obj = this.evaluate(expr.callee);

        let index = this.evaluate(expr.index);
        if (Array.isArray(obj)) {
            if (!Number.isInteger(index)) {
                throw new RuntimeError(
                    expr.closeBracket,
                    "Somente inteiros podem ser usados para indexar um vetor."
                );
            }

            if (index < 0 && obj.length !== 0) {
                while (index < 0) {
                    index += obj.length;
                }
            }

            if (index >= obj.length) {
                throw new RuntimeError(expr.closeBracket, "Index do vetor fora do intervalo.");
            }
            return obj[index];
        }

        else if (
            obj.constructor == Object ||
            obj instanceof EguaInstance ||
            obj instanceof EguaFunction ||
            obj instanceof EguaClass ||
            obj instanceof EguaModule
        ) {
            return obj[index] || null;
        }

        else if (typeof obj === "string") {
            if (!Number.isInteger(index)) {
                throw new RuntimeError(
                    expr.closeBracket,
                    "Somente inteiros podem ser usados para indexar um vetor."
                );
            }

            if (index < 0 && obj.length !== 0) {
                while (index < 0) {
                    index += obj.length;
                }
            }

            if (index >= obj.length) {
                throw new RuntimeError(expr.closeBracket, "Index fora do tamanho.");
            }
            return obj.charAt(index);
        }

        else {
            throw new RuntimeError(
                expr.callee.name,
                "Somente listas, dicionários, classes e objetos podem ser mudados por sobrescrita."
            );
        }
    }

    visitSetExpr(expr) {
        let obj = this.evaluate(expr.object);

        if (!(obj instanceof EguaInstance) && obj.constructor !== Object) {
            throw new RuntimeError(
                expr.object.name,
                "Somente instâncias e dicionários podem possuir campos."
            );
        }

        let value = this.evaluate(expr.value);
        if (obj instanceof EguaInstance) {
            obj.set(expr.name, value);
            return value;
        } else if (obj.constructor == Object) {
            obj[expr.name.lexeme] = value;
        }
    }

    visitFunctionStmt(stmt) {
        let func = new EguaFunction(
            stmt.name.lexeme,
            stmt.func,
            this.environment,
            false
        );
        this.environment.defineVar(stmt.name.lexeme, func);
    }

    visitClassStmt(stmt) {
        let superclass = null;
        if (stmt.superclass !== null) {
            superclass = this.evaluate(stmt.superclass);
            if (!(superclass instanceof EguaClass)) {
                throw new RuntimeError(
                    stmt.superclass.name,
                    "Superclasse precisa ser uma classe."
                );
            }
        }

        this.environment.defineVar(stmt.name.lexeme, null);

        if (stmt.superclass !== null) {
            this.environment = new Environment(this.environment);
            this.environment.defineVar("super", superclass);
        }

        let methods = {};
        let definedMethods = stmt.methods;
        for (let i = 0; i < stmt.methods.length; i++) {
            let currentMethod = definedMethods[i];
            let isInitializer = currentMethod.name.lexeme === "construtor";
            let func = new EguaFunction(
                currentMethod.name.lexeme,
                currentMethod.func,
                this.environment,
                isInitializer
            );
            methods[currentMethod.name.lexeme] = func;
        }

        let created = new EguaClass(stmt.name.lexeme, superclass, methods);

        if (superclass !== null) {
            this.environment = this.environment.enclosing;
        }

        this.environment.assignVar(stmt.name, created);
        return null;
    }

    visitGetExpr(expr) {
        let object = this.evaluate(expr.object);
        if (object instanceof EguaInstance) {
            return object.get(expr.name) || null;
        } else if (object.constructor == Object) {
            return object[expr.name.lexeme] || null;
        } else if (object instanceof EguaModule) {
            return object[expr.name.lexeme] || null;
        }

        throw new RuntimeError(
            expr.name,
            "Você só pode acessar métodos do objeto e dicionários."
        );
    }

    visitThisExpr(expr) {
        return this.lookupVar(expr.keyword, expr);
    }

    visitDictionaryExpr(expr) {
        let dict = {};
        for (let i = 0; i < expr.keys.length; i++) {
            dict[this.evaluate(expr.keys[i])] = this.evaluate(expr.values[i]);
        }
        return dict;
    }

    visitArrayExpr(expr) {
        let values = [];
        for (let i = 0; i < expr.values.length; i++) {
            values.push(this.evaluate(expr.values[i]));
        }
        return values;
    }

    visitSuperExpr(expr) {
        let distance = this.locals.get(expr);
        let superclass = this.environment.getVarAt(distance, "super");

        let object = this.environment.getVarAt(distance - 1, "isto");

        let method = superclass.findMethod(expr.method.lexeme);

        if (method === undefined) {
            throw new RuntimeError(
                expr.method,
                "Método chamado indefinido."
            );
        }

        return method.bind(object);
    }

    stringify(object) {
        if (object === null) return "nulo";
        if (Array.isArray(object)) return object;

        return object.toString();
    }

    execute(stmt) {
        stmt.accept(this);
    }

    interpret(statements) {
        try {
            for (let i = 0; i < statements.length; i++) {
                this.execute(statements[i]);
            }
        } catch (error) {
            this.Egua.runtimeError(error);
        }
    }
};
},{"./egua.js":1,"./environment.js":2,"./errors.js":3,"./lib/globalLib.js":8,"./lib/importStdlib.js":9,"./structures/callable.js":14,"./structures/class.js":15,"./structures/function.js":16,"./structures/instance.js":17,"./structures/module.js":18,"./structures/standardFn.js":19,"./tokenTypes.js":20,"fs":22,"path":23}],6:[function(require,module,exports){
const tokenTypes = require("./tokenTypes.js");

const reservedWords = {
    e: tokenTypes.E,
    em: tokenTypes.EM,
    classe: tokenTypes.CLASSE,
    senao: tokenTypes.SENAO,
    falso: tokenTypes.FALSO,
    para: tokenTypes.PARA,
    funcao: tokenTypes.FUNCAO,
    se: tokenTypes.SE,
    senaose: tokenTypes.SENAOSE,
    nulo: tokenTypes.NULO,
    ou: tokenTypes.OU,
    escreva: tokenTypes.ESCREVA,
    retorna: tokenTypes.RETORNA,
    super: tokenTypes.SUPER,
    isto: tokenTypes.ISTO,
    verdadeiro: tokenTypes.VERDADEIRO,
    var: tokenTypes.VAR,
    faca: tokenTypes.FACA,
    enquanto: tokenTypes.ENQUANTO,
    pausa: tokenTypes.PAUSA,
    continua: tokenTypes.CONTINUA,
    escolha: tokenTypes.ESCOLHA,
    caso: tokenTypes.CASO,
    padrao: tokenTypes.PADRAO,
    importar: tokenTypes.IMPORTAR,
    tente: tokenTypes.TENTE,
    pegue: tokenTypes.PEGUE,
    finalmente: tokenTypes.FINALMENTE,
    herda: tokenTypes.HERDA
};

class Token {
    constructor(type, lexeme, literal, line) {
        this.type = type;
        this.lexeme = lexeme;
        this.literal = literal;
        this.line = line;
    }

    toString() {
        return this.type + " " + this.lexeme + " " + this.literal;
    }
}

module.exports = class Lexer {
    constructor(code, Egua) {
        this.Egua = Egua;
        this.code = code;

        this.tokens = [];

        this.start = 0;
        this.current = 0;
        this.line = 1;
    }

    isDigit(c) {
        return c >= "0" && c <= "9";
    }

    isAlpha(c) {
        return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == "_";
    }

    isAlphaNumeric(c) {
        return this.isDigit(c) || this.isAlpha(c);
    }

    endOfCode() {
        return this.current >= this.code.length;
    }

    advance() {
        this.current += 1;
        return this.code[this.current - 1];
    }

    addToken(type, literal = null) {
        const text = this.code.substring(this.start, this.current);
        this.tokens.push(new Token(type, text, literal, this.line));
    }

    match(expected) {
        if (this.endOfCode()) {
            return false;
        }

        if (this.code[this.current] !== expected) {
            return false;
        }

        this.current += 1;
        return true;
    }

    peek() {
        if (this.endOfCode()) return "\0";
        return this.code.charAt(this.current);
    }

    peekNext() {
        if (this.current + 1 >= this.code.length) return "\0";
        return this.code.charAt(this.current + 1);
    }

    previous() {
        return this.code.charAt(this.current - 1);
    }

    parseString(stringChar = '"') {
        while (this.peek() !== stringChar && !this.endOfCode()) {
            if (this.peek() === "\n") this.line = +1;
            this.advance();
        }

        if (this.endOfCode()) {
            this.Egua.lexerError(
                this.line,
                this.previous(),
                "Texto não finalizado."
            );
            return;
        }

        this.advance();

        let value = this.code.substring(this.start + 1, this.current - 1);
        this.addToken(tokenTypes.STRING, value);
    }

    parseNumber() {
        while (this.isDigit(this.peek())) {
            this.advance();
        }

        if (this.peek() == "." && this.isDigit(this.peekNext())) {
            this.advance();

            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }

        const fullNumber = this.code.substring(this.start, this.current);
        this.addToken(tokenTypes.NUMBER, parseFloat(fullNumber));
    }

    identifyKeyword() {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }

        const c = this.code.substring(this.start, this.current);
        const type = c in reservedWords ? reservedWords[c] : tokenTypes.IDENTIFIER;

        this.addToken(type);
    }

    scanToken() {
        const char = this.advance();

        switch (char) {
            case "[":
                this.addToken(tokenTypes.LEFT_SQUARE_BRACKET);
                break;
            case "]":
                this.addToken(tokenTypes.RIGHT_SQUARE_BRACKET);
                break;
            case "(":
                this.addToken(tokenTypes.LEFT_PAREN);
                break;
            case ")":
                this.addToken(tokenTypes.RIGHT_PAREN);
                break;
            case "{":
                this.addToken(tokenTypes.LEFT_BRACE);
                break;
            case "}":
                this.addToken(tokenTypes.RIGHT_BRACE);
                break;
            case ",":
                this.addToken(tokenTypes.COMMA);
                break;
            case ".":
                this.addToken(tokenTypes.DOT);
                break;
            case "-":
                this.addToken(tokenTypes.MINUS);
                break;
            case "+":
                this.addToken(tokenTypes.PLUS);
                break;
            case ":":
                this.addToken(tokenTypes.COLON);
                break;
            case ";":
                this.addToken(tokenTypes.SEMICOLON);
                break;
            case "%":
                this.addToken(tokenTypes.MODULUS);
                break;
            case "*":
                if (this.peek() === "*") {
                    this.advance();
                    this.addToken(tokenTypes.STAR_STAR);
                    break;
                }
                this.addToken(tokenTypes.STAR);
                break;
            case "!":
                this.addToken(
                    this.match("=") ? tokenTypes.BANG_EQUAL : tokenTypes.BANG
                );
                break;
            case "=":
                this.addToken(
                    this.match("=") ? tokenTypes.EQUAL_EQUAL : tokenTypes.EQUAL
                );
                break;

            case "&":
                this.addToken(tokenTypes.BIT_AND);
                break;

            case "~":
                this.addToken(tokenTypes.BIT_NOT);
                break;

            case "|":
                this.addToken(tokenTypes.BIT_OR);
                break;

            case "^":
                this.addToken(tokenTypes.BIT_XOR);
                break;

            case "<":
                if (this.match("=")) {
                    this.addToken(tokenTypes.LESS_EQUAL);
                } else if (this.match("<")) {
                    this.addToken(tokenTypes.LESSER_LESSER);
                } else {
                    this.addToken(tokenTypes.LESS);
                }
                break;

            case ">":
                if (this.match("=")) {
                    this.addToken(tokenTypes.GREATER_EQUAL);
                } else if (this.match(">")) {
                    this.addToken(tokenTypes.GREATER_GREATER);
                } else {
                    this.addToken(tokenTypes.GREATER);
                }
                break;

            case "/":
                if (this.match("/")) {
                    while (this.peek() != "\n" && !this.endOfCode()) this.advance();
                } else {
                    this.addToken(tokenTypes.SLASH);
                }
                break;

            // Esta sessão ignora espaços em branco na tokenização
            case " ":
            case "\r":
            case "\t":
                break;

            // tentativa de pulhar linha com \n que ainda não funciona
            case "\n":
                this.line += 1;
                break;

            case '"':
                this.parseString('"');
                break;

            case "'":
                this.parseString("'");
                break;

            default:
                if (this.isDigit(char)) this.parseNumber();
                else if (this.isAlpha(char)) this.identifyKeyword();
                else this.Egua.lexerError(this.line, char, "Caractere inesperado.");
        }
    }

    scan() {
        while (!this.endOfCode()) {
            this.start = this.current;
            this.scanToken();
        }

        this.tokens.push(new Token(tokenTypes.EOF, "", null, this.line));
        return this.tokens;
    }
};
},{"./tokenTypes.js":20}],7:[function(require,module,exports){
const RuntimeError = require("../errors.js").RuntimeError;

module.exports.aprox = function(num) {
  if (isNaN(num) || num === null)
    throw new RuntimeError(
      this.token,
      "Você deve prover um número para mat.aprox(número)."
    );

  return Math.round(num);
};

module.exports.raizq = function(num) {
  if (isNaN(num) || num === null)
    throw new RuntimeError(
      this.token,
      "Você deve prover um número para mat.raizq(número)."
    );

  return Math.sqrt(num);
};

/* module.exports.floor = function(num) {
  if (isNaN(num) || num === null)
    throw new RuntimeError(
      this.token,
      "Você deve prover um número para mat.floor(número)."
    );

  return Math.floor(num);
} */

module.exports.sen = function(num) {
  if (isNaN(num) || num === null)
    throw new RuntimeError(
      this.token,
      "Você deve prover um número para mat.sen(número)."
    );

  return Math.sin(num);
};

module.exports.cos = function(num) {
  if (isNaN(num) || num === null)
    throw new RuntimeError(
      this.token,
      "Você deve prover um número para mat.cos(número)."
    );

  return Math.cos(num);
};

module.exports.tan = function(num) {
  if (isNaN(num) || num === null)
    throw new RuntimeError(
      this.token,
      "Você deve prover um número para mat.tan(número)."
    );

  return Math.tan(num);
};

module.exports.radiano = function(angle) {
  if (isNaN(angle) || angle === null)
    throw new RuntimeError(
      this.token,
      "Você deve prover um número para mat.radiano(Ângulo)."
    );

  return angle * (Math.PI / 180);
};

module.exports.graus = function(angle) {
  if (isNaN(angle) || angle === null)
    throw new RuntimeError(
      this.token,
      "Você deve prover um número para mat.graus(ângulo)."
    );

  return angle * (180 / Math.PI);
};

module.exports.pi = Math.PI; 

module.exports.raiz = function(num, root) {
  if (isNaN(num) || num === null)
    throw new RuntimeError(
      this.token,
      "Número dado a mat.raiz(numero, raiz) precisa ser um número."
    );

  if (isNaN(root) || root === null)
    throw new RuntimeError(
      this.token,
      "Raiz dada a mat.raiz(numero, raiz) precisa ser um número."
    );

  let originalRoot = root;

  let negateFlag = root % 2 == 1 && num < 0;
  if (negateFlag) num = -num;
  let possible = Math.pow(num, 1 / root);
  root = Math.pow(possible, root);
  if (Math.abs(num - root) < 1 && num > 0 == root > 0)
    return negateFlag ? -possible : possible;

  else throw new RuntimeError(this.token, `Erro ao encontrar a raiz ${ originalRoot } de ${ num }.`)
};
},{"../errors.js":3}],8:[function(require,module,exports){
const RuntimeError = require("../errors.js").RuntimeError;
const EguaFunction = require("../structures/function.js");
const EguaInstance = require("../structures/instance.js");
const StandardFn = require("../structures/standardFn.js");
const EguaClass = require("../structures/class.js");

/**
 * 
 */
module.exports = function (globals) {
  globals.defineVar(
    "tamanho",
    new StandardFn(1, function (obj) {
      if (!isNaN(obj)) {
        throw new RuntimeError(
          this.token,
          "Não é possível encontrar o tamanho de um número."
        );
      }

      if (obj instanceof EguaInstance) {
        throw new RuntimeError(
          this.token,
          "Você não pode encontrar o tamanho de uma declaração."
        );
      }

      if (obj instanceof EguaFunction) {
        return obj.declaration.params.length;
      }

      if (obj instanceof StandardFn) {
        return obj.arityValue;
      }

      if (obj instanceof EguaClass) {
        let methods = obj.methods;
        let length = 0;

        if (methods.init && methods.init.isInitializer) {
          length = methods.init.declaration.params.length;
        }

        return length;
      }

      return obj.length;
    })
  );

  globals.defineVar(
    "texto",
    new StandardFn(1, function (value) {
      return `${value}`;
    })
  );

  globals.defineVar(
    "real",
    new StandardFn(1, function (value) {
      if (!/^-{0,1}\d+$/.test(value) && !/^\d+\.\d+$/.test(value))
        throw new RuntimeError(
          this.token,
          "Somente números podem passar para real."
        );
      return parseFloat(value);
    })
  );

  globals.defineVar(
    "inteiro",
    new StandardFn(1, function (value) {
      if (value === undefined || value === null) {
        throw new RuntimeError(
          this.token,
          "Somente números podem passar para inteiro."
        );
      }

      if (!/^-{0,1}\d+$/.test(value) && !/^\d+\.\d+$/.test(value)) {
        throw new RuntimeError(
          this.token,
          "Somente números podem passar para inteiro."
        );
      }

      return parseInt(value);
    })
  );

  globals.defineVar("exports", {});

  return globals;
};
},{"../errors.js":3,"../structures/class.js":15,"../structures/function.js":16,"../structures/instance.js":17,"../structures/standardFn.js":19}],9:[function(require,module,exports){
const StandardFn = require("../structures/standardFn.js");
const EguaModule = require("../structures/module.js");

const loadModule = function (moduleName, modulePath) {
    let moduleData = require(modulePath);
    let newModule = new EguaModule(moduleName);

    let keys = Object.keys(moduleData);
    for (let i = 0; i < keys.length; i++) {
        let currentItem = moduleData[keys[i]];

        if (typeof currentItem === "function") {
            newModule[keys[i]] = new StandardFn(currentItem.length, currentItem);
        } else {
            newModule[keys[i]] = currentItem;
        }
    }

    return newModule;
};

require("./time.js");
require("./eguamat.js");

module.exports = function (name) {
    switch (name) {
        case "time":
            return loadModule("time", "./time.js");
        case "eguamat":
            return loadModule("eguamat", "./eguamat.js");
    }

    return null;
};
},{"../structures/module.js":18,"../structures/standardFn.js":19,"./eguamat.js":7,"./time.js":10}],10:[function(require,module,exports){
module.exports.time = function () {
    return +new Date();
};

module.exports.hora = function (timestamp) {
    let timeFormatted = timestamp !== null ? new Date(timestamp) : new Date();
    return timeFormatted;
};

module.exports.dormir = function (ms) {
    let now = new Date().getTime();
    while (new Date().getTime() < now + ms) { }
    return null;
};
},{}],11:[function(require,module,exports){
const tokenTypes = require("./tokenTypes.js");
const Expr = require("./expr.js");
const Stmt = require("./stmt.js");

class ParserError extends Error { }

module.exports = class Parser {
    constructor(tokens, Egua) {
        this.tokens = tokens;
        this.Egua = Egua;

        this.current = 0;
        this.loopDepth = 0;
    }

    synchronize() {
        this.advance();

        while (!this.isAtEnd()) {
            if (this.previous().type == tokenTypes.SEMICOLON) return;

            switch (this.peek().type) {
                case tokenTypes.CLASSE:
                case tokenTypes.FUNCAO:
                case tokenTypes.VAR:
                case tokenTypes.PARA:
                case tokenTypes.SE:
                case tokenTypes.ENQUANTO:
                case tokenTypes.ESCREVA:
                case tokenTypes.RETORNA:
                    return;
            }

            this.advance();
        }
    }

    error(token, errorMessage) {
        this.Egua.error(token, errorMessage);
        return new ParserError();
    }

    consume(type, errorMessage) {
        if (this.check(type)) return this.advance();
        else throw this.error(this.peek(), errorMessage);
    }

    check(type) {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    checkNext(type) {
        if (this.isAtEnd()) return false;
        return this.tokens[this.current + 1].type === type;
    }

    peek() {
        return this.tokens[this.current];
    }

    previous() {
        return this.tokens[this.current - 1];
    }

    isAtEnd() {
        return this.peek().type == tokenTypes.EOF;
    }

    advance() {
        if (!this.isAtEnd()) this.current += 1;
        return this.previous();
    }

    match(...args) {
        for (let i = 0; i < args.length; i++) {
            let currentType = args[i];
            if (this.check(currentType)) {
                this.advance();
                return true;
            }
        }

        return false;
    }

    primary() {
        if (this.match(tokenTypes.SUPER)) {
            let keyword = this.previous();
            this.consume(tokenTypes.DOT, "Esperado '.' após 'super'.");
            let method = this.consume(
                tokenTypes.IDENTIFIER,
                "Esperado nome do método da superclasse."
            );
            return new Expr.Super(keyword, method);
        }
        if (this.match(tokenTypes.LEFT_SQUARE_BRACKET)) {
            let values = [];
            if (this.match(tokenTypes.RIGHT_SQUARE_BRACKET)) {
                return new Expr.Array([]);
            }
            while (!this.match(tokenTypes.RIGHT_SQUARE_BRACKET)) {
                let value = this.assignment();
                values.push(value);
                if (this.peek().type !== tokenTypes.RIGHT_SQUARE_BRACKET) {
                    this.consume(
                        tokenTypes.COMMA,
                        "Esperado vírgula antes da próxima expressão."
                    );
                }
            }
            return new Expr.Array(values);
        }
        if (this.match(tokenTypes.LEFT_BRACE)) {
            let keys = [];
            let values = [];
            if (this.match(tokenTypes.RIGHT_BRACE)) {
                return new Expr.Dictionary([], []);
            }
            while (!this.match(tokenTypes.RIGHT_BRACE)) {
                let key = this.assignment();
                this.consume(
                    tokenTypes.COLON,
                    "Esperado ':' entre chave e valor."
                );
                let value = this.assignment();

                keys.push(key);
                values.push(value);

                if (this.peek().type !== tokenTypes.RIGHT_BRACE) {
                    this.consume(
                        tokenTypes.COMMA,
                        "Esperado vígula antes da próxima expressão."
                    );
                }
            }
            return new Expr.Dictionary(keys, values);
        }
        if (this.match(tokenTypes.FUNCAO)) return this.functionBody("funcao");
        if (this.match(tokenTypes.FALSO)) return new Expr.Literal(false);
        if (this.match(tokenTypes.VERDADEIRO)) return new Expr.Literal(true);
        if (this.match(tokenTypes.NULO)) return new Expr.Literal(null);
        if (this.match(tokenTypes.ISTO)) return new Expr.Isto(this.previous());

        if (this.match(tokenTypes.IMPORTAR)) return this.importStatement();

        if (this.match(tokenTypes.NUMBER, tokenTypes.STRING)) {
            return new Expr.Literal(this.previous().literal);
        }

        if (this.match(tokenTypes.IDENTIFIER)) {
            return new Expr.Variable(this.previous());
        }

        if (this.match(tokenTypes.LEFT_PAREN)) {
            let expr = this.expression();
            this.consume(tokenTypes.RIGHT_PAREN, "Esperado ')' após a expressão.");
            return new Expr.Grouping(expr);
        }

        throw this.error(this.peek(), "Esperado expressão.");
    }

    finishCall(callee) {
        let args = [];
        if (!this.check(tokenTypes.RIGHT_PAREN)) {
            do {
                if (args.length >= 255) {
                    error(this.peek(), "Não pode haver mais de 255 argumentos.");
                }
                args.push(this.expression());
            } while (this.match(tokenTypes.COMMA));
        }

        let paren = this.consume(
            tokenTypes.RIGHT_PAREN,
            "Esperado ')' após os argumentos."
        );

        return new Expr.Call(callee, paren, args);
    }

    call() {
        let expr = this.primary();

        while (true) {
            if (this.match(tokenTypes.LEFT_PAREN)) {
                expr = this.finishCall(expr);
            } else if (this.match(tokenTypes.DOT)) {
                let name = this.consume(
                    tokenTypes.IDENTIFIER,
                    "Esperado nome do método após '.'."
                );
                expr = new Expr.Get(expr, name);
            } else if (this.match(tokenTypes.LEFT_SQUARE_BRACKET)) {
                let index = this.expression();
                let closeBracket = this.consume(
                    tokenTypes.RIGHT_SQUARE_BRACKET,
                    "Esperado ']' após escrita de index."
                );
                expr = new Expr.Subscript(expr, index, closeBracket);
            } else {
                break;
            }
        }

        return expr;
    }

    unary() {
        if (this.match(tokenTypes.BANG, tokenTypes.MINUS, tokenTypes.BIT_NOT)) {
            let operator = this.previous();
            let right = this.unary();
            return new Expr.Unary(operator, right);
        }

        return this.call();
    }

    exponent() {
        let expr = this.unary();

        while (this.match(tokenTypes.STAR_STAR)) {
            let operator = this.previous();
            let right = this.unary();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    multiplication() {
        let expr = this.exponent();

        while (this.match(tokenTypes.SLASH, tokenTypes.STAR, tokenTypes.MODULUS)) {
            let operator = this.previous();
            let right = this.exponent();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    addition() {
        let expr = this.multiplication();

        while (this.match(tokenTypes.MINUS, tokenTypes.PLUS)) {
            let operator = this.previous();
            let right = this.multiplication();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    bitFill() {
        let expr = this.addition();

        while (this.match(tokenTypes.LESSER_LESSER, tokenTypes.GREATER_GREATER)) {
            let operator = this.previous();
            let right = this.addition();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    bitAnd() {
        let expr = this.bitFill();

        while (this.match(tokenTypes.BIT_AND)) {
            let operator = this.previous();
            let right = this.bitFill();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    bitOr() {
        let expr = this.bitAnd();

        while (this.match(tokenTypes.BIT_OR, tokenTypes.BIT_XOR)) {
            let operator = this.previous();
            let right = this.bitAnd();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    comparison() {
        let expr = this.bitOr();

        while (
            this.match(
                tokenTypes.GREATER,
                tokenTypes.GREATER_EQUAL,
                tokenTypes.LESS,
                tokenTypes.LESS_EQUAL
            )
        ) {
            let operator = this.previous();
            let right = this.bitOr();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    equality() {
        let expr = this.comparison();

        while (this.match(tokenTypes.BANG_EQUAL, tokenTypes.EQUAL_EQUAL)) {
            let operator = this.previous();
            let right = this.comparison();
            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    em() {
        let expr = this.equality();

        while (this.match(tokenTypes.EM)) {
            let operator = this.previous();
            let right = this.equality();
            expr = new Expr.Logical(expr, operator, right);
        }

        return expr;
    }

    e() {
        let expr = this.em();

        while (this.match(tokenTypes.E)) {
            let operator = this.previous();
            let right = this.em();
            expr = new Expr.Logical(expr, operator, right);
        }

        return expr;
    }

    ou() {
        let expr = this.e();

        while (this.match(tokenTypes.OU)) {
            let operator = this.previous();
            let right = this.e();
            expr = new Expr.Logical(expr, operator, right);
        }

        return expr;
    }

    assignment() {
        let expr = this.ou();

        if (this.match(tokenTypes.EQUAL)) {
            let equals = this.previous();
            let value = this.assignment();

            if (expr instanceof Expr.Variable) {
                let name = expr.name;
                return new Expr.Assign(name, value);
            } else if (expr instanceof Expr.Get) {
                let get = expr;
                return new Expr.Set(get.object, get.name, value);
            } else if (expr instanceof Expr.Subscript) {
                return new Expr.Assignsubscript(expr.callee, expr.index, value);
            }
            this.error(equals, "Tarefa de atribuição inválida");
        }

        return expr;
    }

    expression() {
        return this.assignment();
    }

    printStatement() {
        this.consume(
            tokenTypes.LEFT_PAREN,
            "Esperado '(' antes dos valores em escreva."
        );

        let value = this.expression();

        this.consume(
            tokenTypes.RIGHT_PAREN,
            "Esperado ')' após os valores em escreva."
        );
        this.consume(tokenTypes.SEMICOLON, "Esperado ';' após o valor.");

        return new Stmt.Escreva(value);
    }

    expressionStatement() {
        let expr = this.expression();
        this.consume(tokenTypes.SEMICOLON, "Esperado ';' após expressão.");
        return new Stmt.Expression(expr);
    }

    block() {
        let statements = [];

        while (!this.check(tokenTypes.RIGHT_BRACE) && !this.isAtEnd()) {
            statements.push(this.declaration());
        }

        this.consume(tokenTypes.RIGHT_BRACE, "Esperado '}' após o bloco.");
        return statements;
    }

    ifStatement() {
        this.consume(tokenTypes.LEFT_PAREN, "Esperado '(' após 'se'.");
        let condition = this.expression();
        this.consume(tokenTypes.RIGHT_PAREN, "Esperado ')' após condição do se.");

        let thenBranch = this.statement();

        let elifBranches = [];
        while (this.match(tokenTypes.SENAOSE)) {
            this.consume(tokenTypes.LEFT_PAREN, "Esperado '(' após 'senaose'.");
            let elifCondition = this.expression();
            this.consume(
                tokenTypes.RIGHT_PAREN,
                "Esperado ')' apóes codição do 'senaose."
            );

            let branch = this.statement();

            elifBranches.push({
                condition: elifCondition,
                branch
            });
        }

        let elseBranch = null;
        if (this.match(tokenTypes.SENAO)) {
            elseBranch = this.statement();
        }

        return new Stmt.Se(condition, thenBranch, elifBranches, elseBranch);
    }

    whileStatement() {
        try {
            this.loopDepth += 1;

            this.consume(tokenTypes.LEFT_PAREN, "Esperado '(' após 'enquanto'.");
            let condition = this.expression();
            this.consume(tokenTypes.RIGHT_PAREN, "Esperado ')' após condicional.");
            let body = this.statement();

            return new Stmt.Enquanto(condition, body);
        } finally {
            this.loopDepth -= 1;
        }
    }

    forStatement() {
        try {
            this.loopDepth += 1;

            this.consume(tokenTypes.LEFT_PAREN, "Esperado '(' após 'para'.");

            let initializer;
            if (this.match(tokenTypes.SEMICOLON)) {
                initializer = null;
            } else if (this.match(tokenTypes.VAR)) {
                initializer = this.varDeclaration();
            } else {
                initializer = this.expressionStatement();
            }

            let condition = null;
            if (!this.check(tokenTypes.SEMICOLON)) {
                condition = this.expression();
            }

            this.consume(
                tokenTypes.SEMICOLON,
                "Esperado ';' após valores da condicional"
            );

            let increment = null;
            if (!this.check(tokenTypes.RIGHT_PAREN)) {
                increment = this.expression();
            }

            this.consume(tokenTypes.RIGHT_PAREN, "Esperado ')' após cláusulas");

            let body = this.statement();

            return new Stmt.Para(initializer, condition, increment, body);
        } finally {
            this.loopDepth -= 1;
        }
    }

    breakStatement() {
        if (this.loopDepth < 1) {
            this.error(this.previous(), "'pausa' deve estar dentro de um loop.");
        }

        this.consume(tokenTypes.SEMICOLON, "Esperado ';' após 'pausa'.");
        return new Stmt.Pausa();
    }

    continueStatement() {
        if (this.loopDepth < 1) {
            this.error(this.previous(), "'continua' precisa estar em um laço de repetição.");
        }

        this.consume(tokenTypes.SEMICOLON, "Esperado ';' após 'continua'.");
        return new Stmt.Continua();
    }

    returnStatement() {
        let keyword = this.previous();
        let value = null;

        if (!this.check(tokenTypes.SEMICOLON)) {
            value = this.expression();
        }

        this.consume(tokenTypes.SEMICOLON, "Esperado ';' após o retorno.");
        return new Stmt.Retorna(keyword, value);
    }

    switchStatement() {
        try {
            this.loopDepth += 1;

            this.consume(
                tokenTypes.LEFT_PAREN,
                "Esperado '{' após 'escolha'."
            );
            let condition = this.expression();
            this.consume(
                tokenTypes.RIGHT_PAREN,
                "Esperado '}' após a condição de 'escolha'."
            );
            this.consume(
                tokenTypes.LEFT_BRACE,
                "Esperado '{' antes do escopo do 'escolha'."
            );

            let branches = [];
            let defaultBranch = null;
            while (!this.match(tokenTypes.RIGHT_BRACE) && !this.isAtEnd()) {
                if (this.match(tokenTypes.CASO)) {
                    let branchConditions = [this.expression()];
                    this.consume(
                        tokenTypes.COLON,
                        "Esperado ':' após o 'caso'."
                    );

                    while (this.check(tokenTypes.CASO)) {
                        this.consume(tokenTypes.CASO, null);
                        branchConditions.push(this.expression());
                        this.consume(
                            tokenTypes.COLON,
                            "Esperado ':' após declaração do 'caso'."
                        );
                    }

                    let stmts = [];
                    do {
                        stmts.push(this.statement());
                    } while (
                        !this.check(tokenTypes.CASO) &&
                        !this.check(tokenTypes.PADRAO) &&
                        !this.check(tokenTypes.RIGHT_BRACE)
                    );

                    branches.push({
                        conditions: branchConditions,
                        stmts
                    });
                } else if (this.match(tokenTypes.PADRAO)) {
                    if (defaultBranch !== null)
                        throw new ParserError(
                            "Você só pode ter um 'padrao' em cada declaração de 'escolha'."
                        );

                    this.consume(
                        tokenTypes.COLON,
                        "Esperado ':' após declaração do 'padrao'."
                    );

                    let stmts = [];
                    do {
                        stmts.push(this.statement());
                    } while (
                        !this.check(tokenTypes.CASO) &&
                        !this.check(tokenTypes.PADRAO) &&
                        !this.check(tokenTypes.RIGHT_BRACE)
                    );

                    defaultBranch = {
                        stmts
                    };
                }
            }

            return new Stmt.Escolha(condition, branches, defaultBranch);
        } finally {
            this.loopDepth -= 1;
        }
    }

    importStatement() {
        this.consume(tokenTypes.LEFT_PAREN, "Esperado '(' após declaração.");

        let path = this.expression();

        let closeBracket = this.consume(
            tokenTypes.RIGHT_PAREN,
            "Esperado ')' após declaração."
        );

        return new Stmt.Importar(path, closeBracket);
    }

    tryStatement() {
        this.consume(tokenTypes.LEFT_BRACE, "Esperado '{' após a declaração 'tente'.");

        let tryBlock = this.block();

        let catchBlock = null;
        if (this.match(tokenTypes.PEGUE)) {
            this.consume(
                tokenTypes.LEFT_BRACE,
                "Esperado '{' após a declaração 'pegue'."
            );

            catchBlock = this.block();
        }

        let elseBlock = null;
        if (this.match(tokenTypes.SENAO)) {
            this.consume(
                tokenTypes.LEFT_BRACE,
                "Esperado '{' após a declaração 'pegue'."
            );

            elseBlock = this.block();
        }

        let finallyBlock = null;
        if (this.match(tokenTypes.FINALMENTE)) {
            this.consume(
                tokenTypes.LEFT_BRACE,
                "Esperado '{' após a declaração 'pegue'."
            );

            finallyBlock = this.block();
        }

        return new Stmt.Tente(tryBlock, catchBlock, elseBlock, finallyBlock);
    }

    doStatement() {
        try {
            this.loopDepth += 1;

            let doBranch = this.statement();

            this.consume(
                tokenTypes.ENQUANTO,
                "Esperado delcaração do 'enquanto' após o escopo do 'faca'."
            );
            this.consume(
                tokenTypes.LEFT_PAREN,
                "Esperado '(' após declaração 'enquanto'."
            );

            let whileCondition = this.expression();

            this.consume(
                tokenTypes.RIGHT_PAREN,
                "Esperado ')' após declaração do 'enquanto'."
            );

            return new Stmt.Faca(doBranch, whileCondition);
        } finally {
            this.loopDepth -= 1;
        }
    }

    statement() {
        if (this.match(tokenTypes.FACA)) return this.doStatement();
        if (this.match(tokenTypes.TENTE)) return this.tryStatement();
        if (this.match(tokenTypes.ESCOLHA)) return this.switchStatement();
        if (this.match(tokenTypes.RETORNA)) return this.returnStatement();
        if (this.match(tokenTypes.CONTINUA)) return this.continueStatement();
        if (this.match(tokenTypes.PAUSA)) return this.breakStatement();
        if (this.match(tokenTypes.PARA)) return this.forStatement();
        if (this.match(tokenTypes.ENQUANTO)) return this.whileStatement();
        if (this.match(tokenTypes.SE)) return this.ifStatement();
        if (this.match(tokenTypes.ESCREVA)) return this.printStatement();
        if (this.match(tokenTypes.LEFT_BRACE)) return new Stmt.Block(this.block());

        return this.expressionStatement();
    }

    varDeclaration() {
        let name = this.consume(tokenTypes.IDENTIFIER, "Esperado nome de variável.");
        let initializer = null;
        if (this.match(tokenTypes.EQUAL)) {
            initializer = this.expression();
        }

        this.consume(
            tokenTypes.SEMICOLON,
            "Esperado ';' após a declaração da variável."
        );
        return new Stmt.Var(name, initializer);
    }

    function(kind) {
        let name = this.consume(tokenTypes.IDENTIFIER, `Esperado nome ${kind}.`);
        return new Stmt.Funcao(name, this.functionBody(kind));
    }

    functionBody(kind) {
        this.consume(tokenTypes.LEFT_PAREN, `Esperado '(' após o nome ${kind}.`);

        let parameters = [];
        if (!this.check(tokenTypes.RIGHT_PAREN)) {
            do {
                if (parameters.length >= 255) {
                    this.error(this.peek(), "Não pode haver mais de 255 parâmetros");
                }

                let paramObj = {};

                if (this.peek().type === tokenTypes.STAR) {
                    this.consume(tokenTypes.STAR, null);
                    paramObj["type"] = "wildcard";
                } else {
                    paramObj["type"] = "standard";
                }

                paramObj['name'] = this.consume(
                    tokenTypes.IDENTIFIER,
                    "Esperado nome do parâmetro."
                );

                if (this.match(tokenTypes.EQUAL)) {
                    paramObj["default"] = this.primary();
                }

                parameters.push(paramObj);

                if (paramObj["type"] === "wildcard") break;
            } while (this.match(tokenTypes.COMMA));
        }

        this.consume(tokenTypes.RIGHT_PAREN, "Esperado ')' após parâmetros.");
        this.consume(tokenTypes.LEFT_BRACE, `Esperado '{' antes do escopo ${kind}.`);

        let body = this.block();

        return new Expr.Funcao(parameters, body);
    }

    classDeclaration() {
        let name = this.consume(tokenTypes.IDENTIFIER, "Esperado nome da classe.");

        let superclass = null;
        if (this.match(tokenTypes.HERDA)) {
            this.consume(tokenTypes.IDENTIFIER, "Esperado nome da superclasse.");
            superclass = new Expr.Variable(this.previous());
        }

        this.consume(tokenTypes.LEFT_BRACE, "Esperado '{' antes do escopo da classe.");

        let methods = [];
        while (!this.check(tokenTypes.RIGHT_BRACE) && !this.isAtEnd()) {
            methods.push(this.function("method"));
        }

        this.consume(tokenTypes.RIGHT_BRACE, "Esperado '}' após o escopo da classe.");
        return new Stmt.Classe(name, superclass, methods);
    }

    declaration() {
        try {
            if (
                this.check(tokenTypes.FUNCAO) &&
                this.checkNext(tokenTypes.IDENTIFIER)
            ) {
                this.consume(tokenTypes.FUNCAO, null);
                return this.function("funcao");
            }
            if (this.match(tokenTypes.VAR)) return this.varDeclaration();
            if (this.match(tokenTypes.CLASSE)) return this.classDeclaration();

            return this.statement();
        } catch (error) {
            this.synchronize();
            return null;
        }
    }

    parse() {
        let statements = [];
        while (!this.isAtEnd()) {
            statements.push(this.declaration());
        }

        return statements
    }
};
},{"./expr.js":4,"./stmt.js":13,"./tokenTypes.js":20}],12:[function(require,module,exports){
class ResolverError extends Error {
    constructor(msg) {
        super(msg);
        this.message = msg;
    }
}

class Stack {
    constructor() {
        this.stack = [];
    }

    push(item) {
        this.stack.push(item);
    }

    isEmpty() {
        return this.stack.length === 0;
    }

    peek() {
        if (this.isEmpty()) throw new Error("Pilha vazia.");
        return this.stack[this.stack.length - 1];
    }

    pop() {
        if (this.isEmpty()) throw new Error("Pilha vazia.");
        return this.stack.pop();
    }
}

const FunctionType = {
    NONE: "NONE",
    FUNCAO: "FUNCAO",
    CONSTRUTOR: "CONSTRUTOR",
    METHOD: "METHOD"
};

const ClassType = {
    NONE: "NONE",
    CLASSE: "CLASSE",
    SUBCLASS: "SUBCLASS"
};

const LoopType = {
    NONE: "NONE",
    ENQUANTO: "ENQUANTO",
    ESCOLHA: "ESCOLHA",
    PARA: "PARA",
    FACA: "FACA"
};

module.exports = class Resolver {
    constructor(interpreter, egua) {
        this.interpreter = interpreter;
        this.egua = egua;
        this.scopes = new Stack();

        this.currentFunction = FunctionType.NONE;
        this.currentClass = ClassType.NONE;
        this.currentLoop = ClassType.NONE;
    }

    define(name) {
        if (this.scopes.isEmpty()) return;
        this.scopes.peek()[name.lexeme] = true;
    }

    declare(name) {
        if (this.scopes.isEmpty()) return;
        let scope = this.scopes.peek();
        if (scope.hasOwnProperty(name.lexeme))
            this.egua.error(
                name,
                "Variável com esse nome já declarada neste escopo."
            );
        scope[name.lexeme] = false;
    }

    beginScope() {
        this.scopes.push({});
    }

    endScope() {
        this.scopes.pop();
    }

    resolve(statements) {
        if (Array.isArray(statements)) {
            for (let i = 0; i < statements.length; i++) {
                statements[i].accept(this);
            }
        } else {
            statements.accept(this);
        }
    }

    resolveLocal(expr, name) {
        for (let i = this.scopes.stack.length - 1; i >= 0; i--) {
            if (this.scopes.stack[i].hasOwnProperty(name.lexeme)) {
                this.interpreter.resolve(expr, this.scopes.stack.length - 1 - i);
            }
        }
    }

    visitBlockStmt(stmt) {
        this.beginScope();
        this.resolve(stmt.statements);
        this.endScope();
        return null;
    }

    visitVariableExpr(expr) {
        if (
            !this.scopes.isEmpty() &&
            this.scopes.peek()[expr.name.lexeme] === false
        ) {
            throw new ResolverError(
                "Não é possível ler a variável local em seu próprio inicializador."
            );
        }
        this.resolveLocal(expr, expr.name);
        return null;
    }

    visitVarStmt(stmt) {
        this.declare(stmt.name);
        if (stmt.initializer !== null) {
            this.resolve(stmt.initializer);
        }
        this.define(stmt.name);
        return null;
    }

    visitAssignExpr(expr) {
        this.resolve(expr.value);
        this.resolveLocal(expr, expr.name);
        return null;
    }

    resolveFunction(func, funcType) {
        let enclosingFunc = this.currentFunction;
        this.currentFunction = funcType;

        this.beginScope();
        let params = func.params;
        for (let i = 0; i < params.length; i++) {
            this.declare(params[i]["name"]);
            this.define(params[i]["name"]);
        }
        this.resolve(func.body);
        this.endScope();

        this.currentFunction = enclosingFunc;
    }

    visitFunctionStmt(stmt) {
        this.declare(stmt.name);
        this.define(stmt.name);

        this.resolveFunction(stmt.func, FunctionType.FUNCAO);
        return null;
    }

    visitFunctionExpr(stmt) {
        this.resolveFunction(stmt, FunctionType.FUNCAO);
        return null;
    }

    visitTryStmt(stmt) {
        this.resolve(stmt.tryBranch);

        if (stmt.catchBranch !== null) this.resolve(stmt.catchBranch);
        if (stmt.elseBranch !== null) this.resolve(stmt.elseBranch);
        if (stmt.finallyBranch !== null) this.resolve(stmt.finallyBranch);
    }

    visitClassStmt(stmt) {
        let enclosingClass = this.currentClass;
        this.currentClass = ClassType.CLASSE;

        this.declare(stmt.name);
        this.define(stmt.name);

        if (
            stmt.superclass !== null &&
            stmt.name.lexeme === stmt.superclass.name.lexeme
        ) {
            this.egua.error("Uma classe não pode herdar de si mesma.");
        }

        if (stmt.superclass !== null) {
            this.currentClass = ClassType.SUBCLASS;
            this.resolve(stmt.superclass);
        }

        if (stmt.superclass !== null) {
            this.beginScope();
            this.scopes.peek()["super"] = true;
        }

        this.beginScope();
        this.scopes.peek()["isto"] = true;

        let methods = stmt.methods;
        for (let i = 0; i < methods.length; i++) {
            let declaration = FunctionType.METHOD;

            if (methods[i].name.lexeme === "isto") {
                declaration = FunctionType.CONSTRUTOR;
            }

            this.resolveFunction(methods[i].func, declaration);
        }

        this.endScope();

        if (stmt.superclass !== null) this.endScope();

        this.currentClass = enclosingClass;
        return null;
    }

    visitSuperExpr(expr) {
        if (this.currentClass === ClassType.NONE) {
            this.egua.error(expr.keyword, "Não pode usar 'super' fora de uma classe.");
        } else if (this.currentClass !== ClassType.SUBCLASS) {
            this.egua.error(
                expr.keyword,
                "Não se usa 'super' numa classe sem superclasse."
            );
        }

        this.resolveLocal(expr, expr.keyword);
        return null;
    }

    visitGetExpr(expr) {
        this.resolve(expr.object);
        return null;
    }

    visitExpressionStmt(stmt) {
        this.resolve(stmt.expression);
        return null;
    }

    visitIfStmt(stmt) {
        this.resolve(stmt.condition);
        this.resolve(stmt.thenBranch);

        for (let i = 0; i < stmt.elifBranches.length; i++) {
            this.resolve(stmt.elifBranches[i].condition);
            this.resolve(stmt.elifBranches[i].branch);
        }

        if (stmt.elseBranch !== null) this.resolve(stmt.elseBranch);
        return null;
    }

    visitImportStmt(stmt) {
        this.resolve(stmt.path);
    }

    visitPrintStmt(stmt) {
        this.resolve(stmt.expression);
    }

    visitReturnStmt(stmt) {
        if (this.currentFunction === FunctionType.NONE) {
            this.egua.error(stmt.keyword, "Não é possível retornar do código do escopo superior.");
        }
        if (stmt.value !== null) {
            if (this.currentFunction === FunctionType.CONSTRUTOR) {
                this.egua.error(
                    stmt.keyword,
                    "Não pode retornar o valor do construtor."
                );
            }
            this.resolve(stmt.value);
        }
        return null;
    }

    visitSwitchStmt(stmt) {
        let enclosingType = this.currentLoop;
        this.currentLoop = LoopType.ESCOLHA;

        let branches = stmt.branches;
        let defaultBranch = stmt.defaultBranch;

        for (let i = 0; i < branches.length; i++) {
            this.resolve(branches[i]["stmts"]);
        }

        if (defaultBranch !== null) this.resolve(defaultBranch["stmts"]);

        this.currentLoop = enclosingType;
    }

    visitWhileStmt(stmt) {
        this.resolve(stmt.condition);
        this.resolve(stmt.body);
        return null;
    }

    visitForStmt(stmt) {
        if (stmt.initializer !== null) {
            this.resolve(stmt.initializer);
        }
        if (stmt.condition !== null) {
            this.resolve(stmt.condition);
        }
        if (stmt.increment !== null) {
            this.resolve(stmt.increment);
        }

        let enclosingType = this.currentLoop;
        this.currentLoop = LoopType.ENQUANTO;
        this.resolve(stmt.body);
        this.currentLoop = enclosingType;

        return null;
    }

    visitDoStmt(stmt) {
        this.resolve(stmt.whileCondition);

        let enclosingType = this.currentLoop;
        this.currentLoop = LoopType.FACA;
        this.resolve(stmt.doBranch);
        this.currentLoop = enclosingType;
        return null;
    }

    visitBinaryExpr(expr) {
        this.resolve(expr.left);
        this.resolve(expr.right);
        return null;
    }

    visitCallExpr(expr) {
        this.resolve(expr.callee);

        let args = expr.args;
        for (let i = 0; i < args.length; i++) {
            this.resolve(args[i]);
        }

        return null;
    }

    visitGroupingExpr(expr) {
        this.resolve(expr.expression);
        return null;
    }

    visitDictionaryExpr(expr) {
        for (let i = 0; i < expr.keys.length; i++) {
            this.resolve(expr.keys[i]);
            this.resolve(expr.values[i]);
        }
        return null;
    }

    visitArrayExpr(expr) {
        for (let i = 0; i < expr.values.length; i++) {
            this.resolve(expr.values[i]);
        }
        return null;
    }

    visitSubscriptExpr(expr) {
        this.resolve(expr.callee);
        this.resolve(expr.index);
        return null;
    }

    visitContinueStmt(stmt) {
        return null;
    }

    visitBreakStmt(stmt) {
        return null;
    }

    visitAssignsubscriptExpr(expr) {
        return null;
    }

    visitLiteralExpr(expr) {
        return null;
    }

    visitLogicalExpr(expr) {
        this.resolve(expr.left);
        this.resolve(expr.right);
        return null;
    }

    visitUnaryExpr(expr) {
        this.resolve(expr.right);
        return null;
    }

    visitSetExpr(expr) {
        this.resolve(expr.value);
        this.resolve(expr.object);
        return null;
    }

    visitThisExpr(expr) {
        if (this.currentClass == ClassType.NONE) {
            this.egua.error(expr.keyword, "Não pode usar 'isto' fora da classe.");
        }
        this.resolveLocal(expr, expr.keyword);
        return null;
    }
};
},{}],13:[function(require,module,exports){
class Stmt {
    accept(visitor) { }
}

class Expression extends Stmt {
    constructor(expression) {
        super();
        this.expression = expression;
    }

    accept(visitor) {
        return visitor.visitExpressionStmt(this)
    }
}

class Funcao extends Stmt {
    constructor(name, func) {
        super();
        this.name = name;
        this.func = func;
    }

    accept(visitor) {
        return visitor.visitFunctionStmt(this);
    }
}

class Retorna extends Stmt {
    constructor(keyword, value) {
        super();
        this.keyword = keyword;
        this.value = value;
    }

    accept(visitor) {
        return visitor.visitReturnStmt(this);
    }
}

class Classe extends Stmt {
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

class Block extends Stmt {
    constructor(statements) {
        super();
        this.statements = statements;
    }

    accept(visitor) {
        return visitor.visitBlockStmt(this);
    }
}

class Escreva extends Stmt {
    constructor(expression) {
        super();
        this.expression = expression;
    }

    accept(visitor) {
        return visitor.visitPrintStmt(this);
    }
}

class Importar extends Stmt {
    constructor(path, closeBracket) {
        super();
        this.path = path;
        this.closeBracket = closeBracket;
    }

    accept(visitor) {
        return visitor.visitImportStmt(this);
    }
}

class Faca extends Stmt {
    constructor(doBranch, whileCondition) {
      super();
      this.doBranch = doBranch;
      this.whileCondition = whileCondition;
    }
  
    accept(visitor) {
      return visitor.visitDoStmt(this);
    }
  }

class Enquanto extends Stmt {
    constructor(condition, body) {
        super();
        this.condition = condition;
        this.body = body;
    }

    accept(visitor) {
        return visitor.visitWhileStmt(this);
    }
}

class Para extends Stmt {
    constructor(initializer, condition, increment, body) {
        super();
        this.initializer = initializer;
        this.condition = condition;
        this.increment = increment;
        this.body = body;
    }

    accept(visitor) {
        return visitor.visitForStmt(this);
    }
}

class Tente extends Stmt {
    constructor(tryBranch, catchBranch, elseBranch, finallyBranch) {
        super();
        this.tryBranch = tryBranch;
        this.catchBranch = catchBranch;
        this.elseBranch = elseBranch;
        this.finallyBranch = finallyBranch;
    }

    accept(visitor) {
        return visitor.visitTryStmt(this);
    }
}

class Se extends Stmt {
    constructor(condition, thenBranch, elifBranches, elseBranch) {
        super();
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elifBranches = elifBranches;
        this.elseBranch = elseBranch;
    }

    accept(visitor) {
        return visitor.visitIfStmt(this);
    }
}

class Escolha extends Stmt {
    constructor(condition, branches, defaultBranch) {
        super();
        this.condition = condition;
        this.branches = branches;
        this.defaultBranch = defaultBranch;
    }

    accept(visitor) {
        return visitor.visitSwitchStmt(this);
    }
}

class Pausa extends Stmt {
    constructor() {
        super();
    }

    accept(visitor) {
        return visitor.visitBreakStmt(this);
    }
}

class Continua extends Stmt {
    constructor() {
        super();
    }

    accept(visitor) {
        return visitor.visitContinueStmt(this);
    }
}

class Var extends Stmt {
    constructor(name, initializer) {
        super();
        this.name = name;
        this.initializer = initializer;
    }

    accept(visitor) {
        return visitor.visitVarStmt(this);
    }
}

module.exports = {
    Expression,
    Funcao,
    Retorna,
    Classe,
    Block,
    Escreva,
    Importar,
    Faca,
    Enquanto,
    Para,
    Tente,
    Se,
    Escolha,
    Pausa,
    Continua,
    Var
};
},{}],14:[function(require,module,exports){
module.exports = class Callable {
    arity() {
        return this.arityValue;
    }
};
},{}],15:[function(require,module,exports){
const Callable = require("./callable.js");
const EguaInstance = require("./instance.js");

module.exports = class EguaClass extends Callable {
    constructor(name, superclass, methods) {
        super();
        this.name = name;
        this.superclass = superclass;
        this.methods = methods;
    }

    findMethod(name) {
        if (this.methods.hasOwnProperty(name)) {
            return this.methods[name];
        }

        if (this.superclass !== null) {
            return this.superclass.findMethod(name);
        }

        return undefined;
    }

    toString() {
        return `<classe ${this.name}>`;
    }

    arity() {
        let initializer = this.findMethod("construtor");
        return initializer ? initializer.arity() : 0;
    }

    call(interpreter, args) {
        let instance = new EguaInstance(this);

        let initializer = this.findMethod("construtor");
        if (initializer) {
            initializer.bind(instance).call(interpreter, args);
        }

        return instance;
    }
};
},{"./callable.js":14,"./instance.js":17}],16:[function(require,module,exports){
const Callable = require("./callable.js");
const Environment = require("../environment.js");
const ReturnExpection = require("../errors.js").ReturnException;

module.exports =  class EguaFunction extends Callable {
    constructor(name, declaration, closure, isInitializer = false) {
        super();
        this.name = name;
        this.declaration = declaration;
        this.closure = closure;
        this.isInitializer = isInitializer;
    }

    arity() {
        return this.declaration.params.length;
    }

    toString() {
        if (this.name === null) return "<função>";
        return `<função ${this.name}>`;
    }

    call(interpreter, args) {
        let environment = new Environment(this.closure);
        let params = this.declaration.params;
        for (let i = 0; i < params.length; i++) {
            let param = params[i];

            let name = param["name"].lexeme;
            let value = args[i];
            if (args[i] === null) {
                value = param["default"] ? param["default"].value : null;
            }
            environment.defineVar(name, value);
        }

        try {
            interpreter.executeBlock(this.declaration.body, environment);
        } catch (error) {
            if (error instanceof ReturnExpection) {
                if (this.isInitializer) return this.closure.getVarAt(0, "isto");
                return error.value;
            } else {
                throw error;
            }
        }

        if (this.isInitializer) return this.closure.getVarAt(0, "isto");
        return null;
    }

    bind(instance) {
        let environment = new Environment(this.closure);
        environment.defineVar("isto", instance);
        return new EguaFunction(
            this.name,
            this.declaration,
            environment,
            this.isInitializer
        );
    }
};
},{"../environment.js":2,"../errors.js":3,"./callable.js":14}],17:[function(require,module,exports){
module.exports = class EguaInstance {
    constructor(creatorClass) {
        this.creatorClass = creatorClass;
        this.fields = {};
    }

    get(name) {
        if (this.fields.hasOwnProperty(name.lexeme)) {
            return this.fields[name.lexeme];
        }

        let method = this.creatorClass.findMethod(name.lexeme);
        if (method) return method.bind(this);

        throw new RuntimeError(name, "Método indefinido não recuperado.");
    }

    set(name, value) {
        this.fields[name.lexeme] = value;
    }

    toString() {
        return "<" + this.creatorClass.name + " instância>";
    }
};
},{}],18:[function(require,module,exports){
module.exports = class EguaModule {
    constructor(name) {
        if (name !== undefined) this.name = name;
    }

    toString() {
        return this.name ? `<module ${this.name}>` : "<module>";
    }
};
},{}],19:[function(require,module,exports){
const Callable = require("./callable.js");

module.exports = class StandardFn extends Callable {
    constructor(arityValue, func) {
        super();
        this.arityValue = arityValue;
        this.func = func;
    }

    call(interpreter, args, token) {
        this.token = token;
        return this.func.apply(this, args);
    }

    toString() {
        return "<função>";
    }
};
},{"./callable.js":14}],20:[function(require,module,exports){
module.exports = {
    LEFT_PAREN: "LEFT_PAREN",
    RIGHT_PAREN: "RIGHT_PAREN",
    LEFT_BRACE: "LEFT_BRACE",
    RIGHT_BRACE: "RIGHT_BRACE",
    LEFT_SQUARE_BRACKET: "LEFT_SQUARE_BRACKET",
    RIGHT_SQUARE_BRACKET: "RIGHT_SQUARE_BRACKET",
    COMMA: "COMMA",
    DOT: "DOT",
    MINUS: "MINUS",
    PLUS: "PLUS",
    BIT_AND: "BIT_AND",
    BIT_OR: "BIT_OR",
    BIT_XOR: "BIT_XOR",
    BIT_NOT: "BIT_NOT",
    COLON: "COLON",
    SEMICOLON: "SEMICOLON",
    SLASH: "SLASH",
    STAR: "STAR",
    STAR_STAR: "STAR_STAR",
    MODULUS: "MODULUS",
    BANG: "BANG",
    BANG_EQUAL: "BANG_EQUAL",
    EQUAL: "EQUAL",
    EQUAL_EQUAL: "EQUAL_EQUAL",
    GREATER: "GREATER",
    GREATER_EQUAL: "GREATER_EQUAL",
    LESS: "LESS",
    LESS_EQUAL: "LESS_EQUAL",
    GREATER_GREATER: "GREATER_GREATER",
    LESSER_LESSER: "LESSER_LESSER",
    IDENTIFIER: "IDENTIFIER",
    STRING: "STRING",
    NUMBER: "NUMBER",
    E: "E",
    EM: "EM",
    CLASSE: "CLASSE",
    FALSO: "FALSO",
    FUNCAO: "FUNCAO",
    PARA: "PARA",
    SE: "SE",
    SENAOSE: "SENAOSE",
    SENAO: "SENAO",
    ESCOLHA: "ESCOLHA",
    CASO: "CASO",
    PADRAO: "PADRAO",
    NULO: "NULO",
    OU: "OU",
    ESCREVA: "ESCREVA",
    RETORNA: "RETORNA",
    SUPER: "SUPER",
    ISTO: "ISTO",
    VERDADEIRO: "VERDADEIRO",
    VAR: "VAR",
    ENQUANTO: "ENQUANTO",
    PAUSA: "PAUSA",
    CONTINUA: "CONTINUA",
    HERDA: "HERDA",
    IMPORTAR: "IMPORTAR",
    FACA: "FACA",
    TENTE: "TENTE",
    PEGUE: "PEGUE",
    FINALMENTE: "FINALMENTE",
    EOF: "EOF"
};
},{}],21:[function(require,module,exports){
(function (process){
const Lexer = require("./lexer.js");
const Parser = require("./parser.js");
const Resolver = require("./resolver.js");
const Interpreter = require("./interpreter.js");
const tokenTypes = require("./tokenTypes.js");

module.exports.Egua = class Egua {
  constructor(filename) {
    this.filename = filename;

    this.hadError = false;
    this.hadRuntimeError = false;
  }

  runBlock(code) {
    const interpreter = new Interpreter(this, process.cwd());

    const lexer = new Lexer(code, this);
    const tokens = lexer.scan();

    if (this.hadError === true) return;

    const parser = new Parser(tokens, this);
    const statements = parser.parse();

    if (this.hadError === true) return;

    const resolver = new Resolver(interpreter, this);
    resolver.resolve(statements);

    if (this.hadError === true) return;

    interpreter.interpret(statements);
  }

  report(line, where, message) {
    if (this.filename)
      console.error(
        `[Arquivo: ${this.filename}] [Linha: ${line}] Erro${where}: ${message}`
      );
    else console.error(`[Linha: ${line}] Erro${where}: ${message}`);
    this.hadError = true;
  }

  error(token, errorMessage) {
    if (token.type === tokenTypes.EOF) {
      this.report(token.line, " no fim", errorMessage);
    } else {
      this.report(token.line, ` no '${token.lexeme}'`, errorMessage);
    }
  }

  lexerError(line, char, msg) {
    this.report(line, ` no '${char}'`, msg);
  }

  runtimeError(error) {
    let line = error.token.line;
    if (error.token && line) {
      if (this.filename)
        console.error(
          `Erro: [Arquivo: ${this.filename}] [Linha: ${error.token.line}] ${error.message}`
        );
      else console.error(`Erro: [Linha: ${error.token.line}] ${error.message}`);
    } else {
      console.error(error);
    }
    this.hadRuntimeError = true;
  }
};
}).call(this,require('_process'))
},{"./interpreter.js":5,"./lexer.js":6,"./parser.js":11,"./resolver.js":12,"./tokenTypes.js":20,"_process":24}],22:[function(require,module,exports){

},{}],23:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":24}],24:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[21])(21)
});
