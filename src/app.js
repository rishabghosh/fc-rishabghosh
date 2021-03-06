const fs = require("fs");
const express = require("express");

const {
  COMMENT_FILE,
  GUEST_BOOK_FILE,
  PLACEHOLDER,
  UTF8,
  EQUAL_TO,
  AND,
  EMPTY_STRING,
  SPACE
} = require("./constants.js");

const getInitialComments = function() {
  const initialComments = fs.readFileSync(COMMENT_FILE, UTF8);
  return JSON.parse(initialComments);
};

let INITIAL_COMMENTS = getInitialComments();

const replacePlusToSpace = function(sourceString) {
  return sourceString.replace(/\+/g, SPACE);
};

const parser = function(text) {
  const eachPair = text.split(AND); //each key-val pair
  const args = {};
  eachPair.forEach(keyValue => {
    const parts = keyValue.split(EQUAL_TO);
    const key = parts[0];
    const value = parts[1];
    if (key && value) {
      const newKey = replacePlusToSpace(key);
      const newValue = replacePlusToSpace(value);
      args[newKey] = newValue;
    }
  });
  return args;
};

const logRequest = function(req, res, next) {
  console.log("\n------ LOGS -------\n");
  console.log("requested method ->", req.method);
  console.log("requested url -> ", req.url);
  console.log("headers =>", JSON.stringify(req.headers, null, 2));
  console.log("body ->", req.body);
  console.log("\n ------ END ------- \n");
  next();
};

const readBody = function(req, res, next) {
  let content = EMPTY_STRING;
  res.statusCode = 200;
  req.on("data", chunk => (content += chunk));
  req.on("end", () => {
    req.body = content;
    next();
  });
};

const insertTime = function(sourceObject) {
  const date = new Date();
  sourceObject["date"] = date;
  return sourceObject;
};

const generateCommentTable = function(comments) {
  return comments
    .map(comment => {
      const date = new Date(comment.date).toLocaleString();
      return (
        "<tr>" +
        `<td>${date}</td>` +
        `<td>${comment.name}</td>` +
        `<td>${comment.comment}</td>` +
        "</tr>"
      );
    })
    .join("");
};

const renderGuestBook = function(req, res) {
  fs.readFile(GUEST_BOOK_FILE, function(error, data) {
    const initialHtml = data.toString();
    const table = generateCommentTable(INITIAL_COMMENTS);
    const message = initialHtml.replace(PLACEHOLDER, table);
    res.send(message);
  });
};

const writeNewComment = function(req, res) {
  const parsedArgs = parser(req.body);
  const commentWithDate = insertTime(parsedArgs);

  INITIAL_COMMENTS.unshift(commentWithDate);
  renderGuestBook(req, res);
  const commentsToWrite = JSON.stringify(INITIAL_COMMENTS);
  fs.writeFile(COMMENT_FILE, commentsToWrite, error => console.error(error));
};

const app = express();
app.use(readBody);
app.use(logRequest);
app.get("/guest_book.html", renderGuestBook);
app.post("/guest_book.html", writeNewComment);
app.use(express.static("public"));

module.exports = app;
