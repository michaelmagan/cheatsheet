/**
 * Formula Functions Metadata
 * Provides information about HyperFormula's built-in Excel-compatible functions
 */

export interface FunctionInfo {
  name: string;              // Function name (e.g., "SUM")
  category: string;          // Category: "Math", "Statistical", "Text", "Logical", "Date", "Lookup", "Financial", "Information"
  signature: string;         // Function signature with optional params in brackets
  description: string;       // Brief description of what the function does
  example?: string;          // Example usage
}

export const FUNCTION_CATEGORIES = [
  "Math",
  "Statistical",
  "Text",
  "Logical",
  "Date",
  "Lookup",
  "Financial",
  "Information"
] as const;

export type FunctionCategory = typeof FUNCTION_CATEGORIES[number];

/**
 * Comprehensive list of common Excel/HyperFormula functions
 */
export const FORMULA_FUNCTIONS: FunctionInfo[] = [
  // Math & Trigonometry
  {
    name: "SUM",
    category: "Math",
    signature: "SUM(number1, [number2], ...)",
    description: "Adds all numbers in a range of cells",
    example: "=SUM(A1:A10)"
  },
  {
    name: "SUMIF",
    category: "Math",
    signature: "SUMIF(range, criteria, [sum_range])",
    description: "Adds cells that meet a given criteria",
    example: "=SUMIF(A1:A10, \">5\", B1:B10)"
  },
  {
    name: "SUMIFS",
    category: "Math",
    signature: "SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)",
    description: "Adds cells that meet multiple criteria",
    example: "=SUMIFS(C1:C10, A1:A10, \">5\", B1:B10, \"<10\")"
  },
  {
    name: "PRODUCT",
    category: "Math",
    signature: "PRODUCT(number1, [number2], ...)",
    description: "Multiplies all numbers together",
    example: "=PRODUCT(A1:A5)"
  },
  {
    name: "ABS",
    category: "Math",
    signature: "ABS(number)",
    description: "Returns the absolute value of a number",
    example: "=ABS(-5)"
  },
  {
    name: "ROUND",
    category: "Math",
    signature: "ROUND(number, num_digits)",
    description: "Rounds a number to a specified number of digits",
    example: "=ROUND(3.14159, 2)"
  },
  {
    name: "ROUNDUP",
    category: "Math",
    signature: "ROUNDUP(number, num_digits)",
    description: "Rounds a number up, away from zero",
    example: "=ROUNDUP(3.14159, 2)"
  },
  {
    name: "ROUNDDOWN",
    category: "Math",
    signature: "ROUNDDOWN(number, num_digits)",
    description: "Rounds a number down, toward zero",
    example: "=ROUNDDOWN(3.14159, 2)"
  },
  {
    name: "CEILING",
    category: "Math",
    signature: "CEILING(number, [significance])",
    description: "Rounds a number up to the nearest multiple of significance",
    example: "=CEILING(4.3, 1)"
  },
  {
    name: "FLOOR",
    category: "Math",
    signature: "FLOOR(number, [significance])",
    description: "Rounds a number down to the nearest multiple of significance",
    example: "=FLOOR(4.7, 1)"
  },
  {
    name: "MOD",
    category: "Math",
    signature: "MOD(number, divisor)",
    description: "Returns the remainder after division",
    example: "=MOD(10, 3)"
  },
  {
    name: "POWER",
    category: "Math",
    signature: "POWER(number, power)",
    description: "Returns the result of a number raised to a power",
    example: "=POWER(2, 3)"
  },
  {
    name: "SQRT",
    category: "Math",
    signature: "SQRT(number)",
    description: "Returns the square root of a number",
    example: "=SQRT(16)"
  },
  {
    name: "EXP",
    category: "Math",
    signature: "EXP(number)",
    description: "Returns e raised to the power of a given number",
    example: "=EXP(1)"
  },
  {
    name: "LN",
    category: "Math",
    signature: "LN(number)",
    description: "Returns the natural logarithm of a number",
    example: "=LN(10)"
  },
  {
    name: "LOG",
    category: "Math",
    signature: "LOG(number, [base])",
    description: "Returns the logarithm of a number to a specified base",
    example: "=LOG(100, 10)"
  },
  {
    name: "LOG10",
    category: "Math",
    signature: "LOG10(number)",
    description: "Returns the base-10 logarithm of a number",
    example: "=LOG10(100)"
  },
  {
    name: "PI",
    category: "Math",
    signature: "PI()",
    description: "Returns the value of pi (3.14159...)",
    example: "=PI()"
  },
  {
    name: "SIN",
    category: "Math",
    signature: "SIN(number)",
    description: "Returns the sine of an angle in radians",
    example: "=SIN(PI()/2)"
  },
  {
    name: "COS",
    category: "Math",
    signature: "COS(number)",
    description: "Returns the cosine of an angle in radians",
    example: "=COS(PI())"
  },
  {
    name: "TAN",
    category: "Math",
    signature: "TAN(number)",
    description: "Returns the tangent of an angle in radians",
    example: "=TAN(PI()/4)"
  },
  {
    name: "RAND",
    category: "Math",
    signature: "RAND()",
    description: "Returns a random number between 0 and 1",
    example: "=RAND()"
  },
  {
    name: "RANDBETWEEN",
    category: "Math",
    signature: "RANDBETWEEN(bottom, top)",
    description: "Returns a random integer between two values",
    example: "=RANDBETWEEN(1, 100)"
  },

  // Statistical
  {
    name: "AVERAGE",
    category: "Statistical",
    signature: "AVERAGE(number1, [number2], ...)",
    description: "Returns the average (arithmetic mean) of numbers",
    example: "=AVERAGE(A1:A10)"
  },
  {
    name: "AVERAGEIF",
    category: "Statistical",
    signature: "AVERAGEIF(range, criteria, [average_range])",
    description: "Returns the average of cells that meet a criteria",
    example: "=AVERAGEIF(A1:A10, \">5\")"
  },
  {
    name: "AVERAGEIFS",
    category: "Statistical",
    signature: "AVERAGEIFS(average_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)",
    description: "Returns the average of cells that meet multiple criteria",
    example: "=AVERAGEIFS(C1:C10, A1:A10, \">5\", B1:B10, \"<10\")"
  },
  {
    name: "COUNT",
    category: "Statistical",
    signature: "COUNT(value1, [value2], ...)",
    description: "Counts the number of cells that contain numbers",
    example: "=COUNT(A1:A10)"
  },
  {
    name: "COUNTA",
    category: "Statistical",
    signature: "COUNTA(value1, [value2], ...)",
    description: "Counts the number of non-empty cells",
    example: "=COUNTA(A1:A10)"
  },
  {
    name: "COUNTBLANK",
    category: "Statistical",
    signature: "COUNTBLANK(range)",
    description: "Counts the number of blank cells in a range",
    example: "=COUNTBLANK(A1:A10)"
  },
  {
    name: "COUNTIF",
    category: "Statistical",
    signature: "COUNTIF(range, criteria)",
    description: "Counts cells that meet a criteria",
    example: "=COUNTIF(A1:A10, \">5\")"
  },
  {
    name: "COUNTIFS",
    category: "Statistical",
    signature: "COUNTIFS(criteria_range1, criteria1, [criteria_range2, criteria2], ...)",
    description: "Counts cells that meet multiple criteria",
    example: "=COUNTIFS(A1:A10, \">5\", B1:B10, \"<10\")"
  },
  {
    name: "MAX",
    category: "Statistical",
    signature: "MAX(number1, [number2], ...)",
    description: "Returns the largest value in a set of numbers",
    example: "=MAX(A1:A10)"
  },
  {
    name: "MAXIFS",
    category: "Statistical",
    signature: "MAXIFS(max_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)",
    description: "Returns the maximum value among cells that meet criteria",
    example: "=MAXIFS(C1:C10, A1:A10, \">5\")"
  },
  {
    name: "MIN",
    category: "Statistical",
    signature: "MIN(number1, [number2], ...)",
    description: "Returns the smallest value in a set of numbers",
    example: "=MIN(A1:A10)"
  },
  {
    name: "MINIFS",
    category: "Statistical",
    signature: "MINIFS(min_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)",
    description: "Returns the minimum value among cells that meet criteria",
    example: "=MINIFS(C1:C10, A1:A10, \">5\")"
  },
  {
    name: "MEDIAN",
    category: "Statistical",
    signature: "MEDIAN(number1, [number2], ...)",
    description: "Returns the median (middle value) of numbers",
    example: "=MEDIAN(A1:A10)"
  },
  {
    name: "MODE",
    category: "Statistical",
    signature: "MODE(number1, [number2], ...)",
    description: "Returns the most frequently occurring value",
    example: "=MODE(A1:A10)"
  },
  {
    name: "STDEV",
    category: "Statistical",
    signature: "STDEV(number1, [number2], ...)",
    description: "Calculates standard deviation based on a sample",
    example: "=STDEV(A1:A10)"
  },
  {
    name: "STDEVP",
    category: "Statistical",
    signature: "STDEVP(number1, [number2], ...)",
    description: "Calculates standard deviation based on entire population",
    example: "=STDEVP(A1:A10)"
  },
  {
    name: "VAR",
    category: "Statistical",
    signature: "VAR(number1, [number2], ...)",
    description: "Calculates variance based on a sample",
    example: "=VAR(A1:A10)"
  },
  {
    name: "VARP",
    category: "Statistical",
    signature: "VARP(number1, [number2], ...)",
    description: "Calculates variance based on entire population",
    example: "=VARP(A1:A10)"
  },

  // Text
  {
    name: "CONCATENATE",
    category: "Text",
    signature: "CONCATENATE(text1, [text2], ...)",
    description: "Joins several text strings into one string",
    example: "=CONCATENATE(A1, \" \", B1)"
  },
  {
    name: "CONCAT",
    category: "Text",
    signature: "CONCAT(text1, [text2], ...)",
    description: "Combines text from multiple ranges and/or strings",
    example: "=CONCAT(A1:A3)"
  },
  {
    name: "TEXTJOIN",
    category: "Text",
    signature: "TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)",
    description: "Joins text with a delimiter",
    example: "=TEXTJOIN(\", \", TRUE, A1:A5)"
  },
  {
    name: "LEFT",
    category: "Text",
    signature: "LEFT(text, [num_chars])",
    description: "Returns the leftmost characters from a text string",
    example: "=LEFT(A1, 5)"
  },
  {
    name: "RIGHT",
    category: "Text",
    signature: "RIGHT(text, [num_chars])",
    description: "Returns the rightmost characters from a text string",
    example: "=RIGHT(A1, 3)"
  },
  {
    name: "MID",
    category: "Text",
    signature: "MID(text, start_num, num_chars)",
    description: "Returns characters from the middle of a text string",
    example: "=MID(A1, 3, 5)"
  },
  {
    name: "LEN",
    category: "Text",
    signature: "LEN(text)",
    description: "Returns the number of characters in a text string",
    example: "=LEN(A1)"
  },
  {
    name: "UPPER",
    category: "Text",
    signature: "UPPER(text)",
    description: "Converts text to uppercase",
    example: "=UPPER(A1)"
  },
  {
    name: "LOWER",
    category: "Text",
    signature: "LOWER(text)",
    description: "Converts text to lowercase",
    example: "=LOWER(A1)"
  },
  {
    name: "PROPER",
    category: "Text",
    signature: "PROPER(text)",
    description: "Capitalizes the first letter of each word",
    example: "=PROPER(A1)"
  },
  {
    name: "TRIM",
    category: "Text",
    signature: "TRIM(text)",
    description: "Removes extra spaces from text",
    example: "=TRIM(A1)"
  },
  {
    name: "SUBSTITUTE",
    category: "Text",
    signature: "SUBSTITUTE(text, old_text, new_text, [instance_num])",
    description: "Replaces old text with new text in a string",
    example: "=SUBSTITUTE(A1, \"old\", \"new\")"
  },
  {
    name: "REPLACE",
    category: "Text",
    signature: "REPLACE(old_text, start_num, num_chars, new_text)",
    description: "Replaces characters within text",
    example: "=REPLACE(A1, 1, 5, \"new\")"
  },
  {
    name: "FIND",
    category: "Text",
    signature: "FIND(find_text, within_text, [start_num])",
    description: "Finds one text string within another (case-sensitive)",
    example: "=FIND(\"text\", A1)"
  },
  {
    name: "SEARCH",
    category: "Text",
    signature: "SEARCH(find_text, within_text, [start_num])",
    description: "Finds one text string within another (case-insensitive)",
    example: "=SEARCH(\"text\", A1)"
  },
  {
    name: "TEXT",
    category: "Text",
    signature: "TEXT(value, format_text)",
    description: "Converts a value to text in a specific number format",
    example: "=TEXT(A1, \"0.00\")"
  },
  {
    name: "VALUE",
    category: "Text",
    signature: "VALUE(text)",
    description: "Converts a text string to a number",
    example: "=VALUE(\"123\")"
  },

  // Logical
  {
    name: "IF",
    category: "Logical",
    signature: "IF(logical_test, value_if_true, [value_if_false])",
    description: "Returns one value if a condition is true, another if false",
    example: "=IF(A1>10, \"High\", \"Low\")"
  },
  {
    name: "IFS",
    category: "Logical",
    signature: "IFS(logical_test1, value_if_true1, [logical_test2, value_if_true2], ...)",
    description: "Checks multiple conditions and returns the first true result",
    example: "=IFS(A1>90, \"A\", A1>80, \"B\", A1>70, \"C\")"
  },
  {
    name: "AND",
    category: "Logical",
    signature: "AND(logical1, [logical2], ...)",
    description: "Returns TRUE if all arguments are TRUE",
    example: "=AND(A1>5, B1<10)"
  },
  {
    name: "OR",
    category: "Logical",
    signature: "OR(logical1, [logical2], ...)",
    description: "Returns TRUE if any argument is TRUE",
    example: "=OR(A1>5, B1<10)"
  },
  {
    name: "NOT",
    category: "Logical",
    signature: "NOT(logical)",
    description: "Reverses the logic of its argument",
    example: "=NOT(A1>5)"
  },
  {
    name: "XOR",
    category: "Logical",
    signature: "XOR(logical1, [logical2], ...)",
    description: "Returns TRUE if an odd number of arguments are TRUE",
    example: "=XOR(A1>5, B1<10)"
  },
  {
    name: "TRUE",
    category: "Logical",
    signature: "TRUE()",
    description: "Returns the logical value TRUE",
    example: "=TRUE()"
  },
  {
    name: "FALSE",
    category: "Logical",
    signature: "FALSE()",
    description: "Returns the logical value FALSE",
    example: "=FALSE()"
  },
  {
    name: "IFERROR",
    category: "Logical",
    signature: "IFERROR(value, value_if_error)",
    description: "Returns a value if no error occurs, otherwise returns error value",
    example: "=IFERROR(A1/B1, 0)"
  },
  {
    name: "IFNA",
    category: "Logical",
    signature: "IFNA(value, value_if_na)",
    description: "Returns a value if #N/A error occurs",
    example: "=IFNA(VLOOKUP(A1, B:C, 2, FALSE), \"Not Found\")"
  },

  // Date & Time
  {
    name: "TODAY",
    category: "Date",
    signature: "TODAY()",
    description: "Returns the current date",
    example: "=TODAY()"
  },
  {
    name: "NOW",
    category: "Date",
    signature: "NOW()",
    description: "Returns the current date and time",
    example: "=NOW()"
  },
  {
    name: "DATE",
    category: "Date",
    signature: "DATE(year, month, day)",
    description: "Creates a date from year, month, and day values",
    example: "=DATE(2024, 12, 31)"
  },
  {
    name: "TIME",
    category: "Date",
    signature: "TIME(hour, minute, second)",
    description: "Creates a time from hour, minute, and second values",
    example: "=TIME(14, 30, 0)"
  },
  {
    name: "YEAR",
    category: "Date",
    signature: "YEAR(serial_number)",
    description: "Returns the year of a date",
    example: "=YEAR(A1)"
  },
  {
    name: "MONTH",
    category: "Date",
    signature: "MONTH(serial_number)",
    description: "Returns the month of a date",
    example: "=MONTH(A1)"
  },
  {
    name: "DAY",
    category: "Date",
    signature: "DAY(serial_number)",
    description: "Returns the day of a date",
    example: "=DAY(A1)"
  },
  {
    name: "WEEKDAY",
    category: "Date",
    signature: "WEEKDAY(serial_number, [return_type])",
    description: "Returns the day of the week (1-7)",
    example: "=WEEKDAY(A1)"
  },
  {
    name: "HOUR",
    category: "Date",
    signature: "HOUR(serial_number)",
    description: "Returns the hour of a time value",
    example: "=HOUR(A1)"
  },
  {
    name: "MINUTE",
    category: "Date",
    signature: "MINUTE(serial_number)",
    description: "Returns the minute of a time value",
    example: "=MINUTE(A1)"
  },
  {
    name: "SECOND",
    category: "Date",
    signature: "SECOND(serial_number)",
    description: "Returns the second of a time value",
    example: "=SECOND(A1)"
  },
  {
    name: "DATEVALUE",
    category: "Date",
    signature: "DATEVALUE(date_text)",
    description: "Converts a date string to a serial number",
    example: "=DATEVALUE(\"12/31/2024\")"
  },
  {
    name: "TIMEVALUE",
    category: "Date",
    signature: "TIMEVALUE(time_text)",
    description: "Converts a time string to a decimal",
    example: "=TIMEVALUE(\"14:30:00\")"
  },
  {
    name: "DAYS",
    category: "Date",
    signature: "DAYS(end_date, start_date)",
    description: "Returns the number of days between two dates",
    example: "=DAYS(B1, A1)"
  },
  {
    name: "EDATE",
    category: "Date",
    signature: "EDATE(start_date, months)",
    description: "Returns a date a specified number of months before/after a date",
    example: "=EDATE(A1, 3)"
  },
  {
    name: "EOMONTH",
    category: "Date",
    signature: "EOMONTH(start_date, months)",
    description: "Returns the last day of the month before/after a specified number of months",
    example: "=EOMONTH(A1, 0)"
  },

  // Lookup & Reference
  {
    name: "VLOOKUP",
    category: "Lookup",
    signature: "VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
    description: "Searches for a value in the first column and returns a value in the same row",
    example: "=VLOOKUP(A1, B:D, 3, FALSE)"
  },
  {
    name: "HLOOKUP",
    category: "Lookup",
    signature: "HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])",
    description: "Searches for a value in the first row and returns a value in the same column",
    example: "=HLOOKUP(A1, B1:E10, 3, FALSE)"
  },
  {
    name: "INDEX",
    category: "Lookup",
    signature: "INDEX(array, row_num, [column_num])",
    description: "Returns a value from a specific position in a range",
    example: "=INDEX(A1:C10, 5, 2)"
  },
  {
    name: "MATCH",
    category: "Lookup",
    signature: "MATCH(lookup_value, lookup_array, [match_type])",
    description: "Returns the relative position of an item in a range",
    example: "=MATCH(A1, B1:B10, 0)"
  },
  {
    name: "XLOOKUP",
    category: "Lookup",
    signature: "XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])",
    description: "Searches a range and returns a corresponding value",
    example: "=XLOOKUP(A1, B:B, C:C)"
  },
  {
    name: "OFFSET",
    category: "Lookup",
    signature: "OFFSET(reference, rows, cols, [height], [width])",
    description: "Returns a reference offset from a starting cell",
    example: "=OFFSET(A1, 2, 3)"
  },
  {
    name: "INDIRECT",
    category: "Lookup",
    signature: "INDIRECT(ref_text, [a1])",
    description: "Returns a reference specified by a text string",
    example: "=INDIRECT(\"A\" & ROW())"
  },
  {
    name: "ROW",
    category: "Lookup",
    signature: "ROW([reference])",
    description: "Returns the row number of a reference",
    example: "=ROW(A5)"
  },
  {
    name: "COLUMN",
    category: "Lookup",
    signature: "COLUMN([reference])",
    description: "Returns the column number of a reference",
    example: "=COLUMN(C1)"
  },
  {
    name: "CHOOSE",
    category: "Lookup",
    signature: "CHOOSE(index_num, value1, [value2], ...)",
    description: "Returns a value from a list based on an index number",
    example: "=CHOOSE(2, \"A\", \"B\", \"C\")"
  },

  // Financial
  {
    name: "PMT",
    category: "Financial",
    signature: "PMT(rate, nper, pv, [fv], [type])",
    description: "Calculates the payment for a loan",
    example: "=PMT(5%/12, 60, 10000)"
  },
  {
    name: "FV",
    category: "Financial",
    signature: "FV(rate, nper, pmt, [pv], [type])",
    description: "Calculates the future value of an investment",
    example: "=FV(5%/12, 60, -100, 0)"
  },
  {
    name: "PV",
    category: "Financial",
    signature: "PV(rate, nper, pmt, [fv], [type])",
    description: "Calculates the present value of an investment",
    example: "=PV(5%/12, 60, -100)"
  },
  {
    name: "RATE",
    category: "Financial",
    signature: "RATE(nper, pmt, pv, [fv], [type], [guess])",
    description: "Returns the interest rate per period of an annuity",
    example: "=RATE(60, -100, 5000)"
  },
  {
    name: "NPER",
    category: "Financial",
    signature: "NPER(rate, pmt, pv, [fv], [type])",
    description: "Returns the number of periods for an investment",
    example: "=NPER(5%/12, -100, 5000)"
  },
  {
    name: "NPV",
    category: "Financial",
    signature: "NPV(rate, value1, [value2], ...)",
    description: "Calculates the net present value of an investment",
    example: "=NPV(10%, A1:A10)"
  },
  {
    name: "IRR",
    category: "Financial",
    signature: "IRR(values, [guess])",
    description: "Returns the internal rate of return for a series of cash flows",
    example: "=IRR(A1:A10)"
  },
  {
    name: "XIRR",
    category: "Financial",
    signature: "XIRR(values, dates, [guess])",
    description: "Returns the internal rate of return for a schedule of cash flows",
    example: "=XIRR(A1:A10, B1:B10)"
  },

  // Information
  {
    name: "ISBLANK",
    category: "Information",
    signature: "ISBLANK(value)",
    description: "Returns TRUE if the value is blank",
    example: "=ISBLANK(A1)"
  },
  {
    name: "ISERROR",
    category: "Information",
    signature: "ISERROR(value)",
    description: "Returns TRUE if the value is any error",
    example: "=ISERROR(A1)"
  },
  {
    name: "ISNA",
    category: "Information",
    signature: "ISNA(value)",
    description: "Returns TRUE if the value is #N/A error",
    example: "=ISNA(A1)"
  },
  {
    name: "ISNUMBER",
    category: "Information",
    signature: "ISNUMBER(value)",
    description: "Returns TRUE if the value is a number",
    example: "=ISNUMBER(A1)"
  },
  {
    name: "ISTEXT",
    category: "Information",
    signature: "ISTEXT(value)",
    description: "Returns TRUE if the value is text",
    example: "=ISTEXT(A1)"
  },
  {
    name: "ISLOGICAL",
    category: "Information",
    signature: "ISLOGICAL(value)",
    description: "Returns TRUE if the value is a logical value",
    example: "=ISLOGICAL(A1)"
  },
  {
    name: "TYPE",
    category: "Information",
    signature: "TYPE(value)",
    description: "Returns the type of value (1=number, 2=text, 4=logical, 16=error, 64=array)",
    example: "=TYPE(A1)"
  },
  {
    name: "N",
    category: "Information",
    signature: "N(value)",
    description: "Converts a value to a number",
    example: "=N(A1)"
  }
];

/**
 * Returns all available functions
 */
export function getAllFunctions(): FunctionInfo[] {
  return FORMULA_FUNCTIONS;
}

/**
 * Returns functions filtered by category
 */
export function getFunctionsByCategory(category: string): FunctionInfo[] {
  return FORMULA_FUNCTIONS.filter(fn =>
    fn.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Searches for functions by name (case-insensitive prefix match)
 */
export function searchFunctions(query: string): FunctionInfo[] {
  const lowerQuery = query.toLowerCase();
  return FORMULA_FUNCTIONS.filter(fn =>
    fn.name.toLowerCase().startsWith(lowerQuery)
  );
}

/**
 * Gets a specific function by exact name match
 */
export function getFunction(name: string): FunctionInfo | undefined {
  return FORMULA_FUNCTIONS.find(fn =>
    fn.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Returns all unique categories
 */
export function getCategories(): string[] {
  return Array.from(new Set(FORMULA_FUNCTIONS.map(fn => fn.category)));
}

/**
 * Returns count of functions per category
 */
export function getCategoryCounts(): Record<string, number> {
  return FORMULA_FUNCTIONS.reduce((acc, fn) => {
    acc[fn.category] = (acc[fn.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
