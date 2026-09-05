import assert from "node:assert/strict";
import test from "node:test";
import { sanitiseFilename, detectContentType, uploadLimit } from "../../apps/web/lib/upload-staging";
test("filenames cannot create path or response-header injection; MIME comes from bytes", () => {
  assert.equal(sanitiseFilename("../../secret\r\n.pdf"), "secret.pdf");
  assert.equal(sanitiseFilename("C:\\private\\test.pdf"), "test.pdf");
  assert.equal(detectContentType(Buffer.from("%PDF-1.4 synthetic")), "application/pdf");
  assert.throws(() => detectContentType(Buffer.from("malware.exe renamed to file.pdf")));
  assert.throws(() => uploadLimit({ SAMMA_UPLOAD_MAX_BYTES: "0" }));
  assert.throws(() => uploadLimit({ SAMMA_UPLOAD_MAX_BYTES: "999999999" }));
});
