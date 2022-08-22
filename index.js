import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import formidable from "formidable";
import fs from "fs";
import { parseString } from "xml2js";
const app = express();
const PORT = process.env.PORT || 5000;

//tried a few different packages, xml2js gets be the xbrl xml sort of structure to json but not quite right
// ixbrl packages all suck and are outdates

import { readFile } from "fs/promises";

//array of every possible key in the xml file
const keys = await readFile("./keys.json")
  .then((json) => JSON.parse(json))
  .catch(() => null);
// console.log({ keys });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

//bunch of shit here from the docs, too many to look at, all plain text hard to find anything useful

// 2.3 XML namespace
const xmlNamespace = {
  name: "http://www.xbrl.org/2008/inlineXBRL",
  version: 1.0,
  date: "20 April 2010",
};
// The XML namespace http://www.xbrl.org/2013/inlineXBRL is to be used exclusively for XML components described in this Specification.
// 2.4 Namespace prefixes
// This Specification uses a number of namespace prefixes when describing elements and attributes. These are:
// Namespace prefix	Namespace name
const namespacePrefixes = [
  { prefix: "ix", name: "http://www.xbrl.org/2013/inlineXBRL" },
  {
    prefix: "ixt",
    name: "http://www.xbrl.org/inlineXBRL/transformation/2010-04-20",
  },
  { prefix: "link", name: "http://www.xbrl.org/2003/linkbase" },
  { prefix: "xbrli", name: "http://www.xbrl.org/2003/instance" },
  { prefix: "xl", name: "http://www.xbrl.org/2003/XLink" },
  { prefix: "xlink", name: "http://www.w3.org/1999/xlink" },
  { prefix: "xml", name: "http://www.w3.org/XML/1998/namespace" },
  { prefix: "xsi", name: "http://www.w3.org/2001/XMLSchema-instance" },
];

// 2.5 Definitions
// An element is reference-equal to another element if and only if their xlink:href  attributes refer to the same resource according to the rules of [XML Base], and the elements are otherwise s-equal.

// 3 Structure

// 3.1 The Inline XBRL Document Set
// The Inline XBRL Document Set is a group of one or more Inline XBRL Documents which when comprising sufficient metadata results in one or more Target Documents when transformed according to the mapping rules prescribed in this Specification.
// An Inline XBRL Document is a well-formed XML document containing both Markup Elements and Inline XBRL Elements and which MAY contain certain other elements as defined herein.
// A Markup Element is an XML element which does not have its namespace name listed in Section 2.4.
// An Inline XBRL Element is any element defined by this Specification with a namespace name which has a value of http://www.xbrl.org/2013/inlineXBRL.
// Within an Inline XBRL Document, the Inline XBRL Elements are interspersed between or nested within Markup Elements, in such a way that the value of each XBRL fact may be displayed by a browser.
// Each one of the Inline XBRL Elements in an Inline XBRL Document represents a different component of a Target Document. In general, each Inline XBRL Element takes the same content model as the matching component of the Target Document, except as set out below. The following Inline XBRL Elements are defined in this Specification:

// Table 1: Inline XBRL Elements
const elements = [
  "ix:continuation",
  "ix:denominator",
  "ix:exclude",
  "ix:footnote",
  "ix:fraction",
  "ix:header",
  "ix:hidden",
  "ix:nonFraction",
  "ix:nonNumeric",
  "ix:numerator",
  "ix:references",
  "ix:relationship",
  "ix:resources",
  "ix:tuple",
];

// The following attribues are defined in this Specification:
// Table 2: Attributes

const attributes = [
  "Name",
  "arcrole",
  "contextRef",
  "continuationFrom",
  "decimals",
  "escape",
  "footnoteRole",
  "format",
  "fromRefs",
  "id",
  "linkRole",
  "name",
  "precision",
  "order",
  "scale",
  "sign",
  "target",
  "title",
  "toRefs",
  "tupleID",
  "tupleRef",
  "unitRef",
];

function iterate(final, obj, stack, prevObj) {
  const hasCRN = (object) => Object.keys(object).length > 0;

  //find the company reg first so can start adding to top level object
  for (var property in obj) {
    if (obj.hasOwnProperty(property)) {
      if (typeof obj[property] == "object") {
        iterate(final, obj[property], stack + "." + property, obj);
      } else {
        if (obj.name) {
          obj.name = obj.name.replace(":", "");
          obj.name = obj.name.replace(".", "");

          if (obj.name.includes("CompaniesHouseRegisteredNumber")) {
            const crn = prevObj._;
            final.entity[crn] = { instant: {}, period: {} };
          }
        }
      }
    }
  }

  // if (hasCRN(final)) { //only start this loop if there is a crn
  for (var property in obj) {
    if (obj.hasOwnProperty(property)) {
      if (typeof obj[property] == "object") {
        iterate(final, obj[property], stack + "." + property, obj);
      } else {
        if (obj.name) {
          obj.name = obj.name.replace(":", "");
          obj.name = obj.name.replace(".", "");

          final.entity[obj.name] = prevObj._;
          // final.entity[Object.keys(final.entity)[0]][obj.name] = prevObj._;
          //start building object inside to reflet the json structure
        }
      }
    }
  }
  // }

  return final;
}

app.post("/api/parseIXBRL", (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log(err);
      res.status(500).send(err);
    } else {
      const path = files.file.filepath;
      const input = fs.readFileSync(path, "utf8");

      parseString(input, (_err, result) => {
        if (_err) console.log(_err);
        let testCompany = { entity: {} };

        const company = iterate(testCompany, result);

        res.send(company);
      }),
        (err) => {
          console.log(err);
          res.send(err);
        };
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
