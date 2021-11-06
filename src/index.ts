import * as asserts from "assert"

import { FirstName } from "./domain.js"

asserts.equal(FirstName.is("Mike"), true)
asserts.equal(FirstName.is(""), false)
asserts.equal(FirstName.is(0), false)
asserts.equal(FirstName.is({}), false)
