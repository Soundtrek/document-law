// Package alias keeps app SMTP separate from Auth.js's unused optional mail peer.
declare module "smtp-mailer" {
  import nodemailer = require("nodemailer");
  export = nodemailer;
}
