export type DynamicObject = { [key: string]: any }; // This still has any.

// Let's create strict types avoiding any.
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
    [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];

export type AppData = JSONObject;
export type AppEvent = unknown; // e.g. for catch clauses
