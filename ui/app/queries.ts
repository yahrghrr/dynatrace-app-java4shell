/**
 * Java processes and their Java4Shell status.
 *
 * Based on the detection query provided for this app, with two changes so the UI can
 * count both sides:
 *   - the `filter status != "OK"` step is removed (OK rows are needed for "not impacted")
 *   - the process `id` is kept so processes can be counted distinctly
 */
// eslint-disable-next-line noSecrets/no-secrets -- DQL text, not a secret
export const JAVA_PROCESS_QUERY = `smartscapeNodes PROCESS
| fieldsAdd process.software_technologies.os,
            process.software_technologies.java,
            process.metadata,
            host.id = arrayFirst(references[runs_on.host])
| fieldsAdd techs = arrayConcat(
      coalesce(process.software_technologies.os, array()),
      coalesce(process.software_technologies.java, array()))
| expand t = techs
| fieldsAdd java.type = t[type], java.edition = t[edition], java.version = t[version]
| filter java.type == "JAVA" and isNotNull(java.version) and java.version != ""
| dedup {id, java.version}
| parse java.version, "INT:major '.' INT:minor '.' INT:patch ('.' INT:build)?"
| fieldsAdd build = coalesce(build, 0)
| fieldsAdd status = if(
      (major == 17 and patch >= 6 and (patch < 21 or (patch == 21 and build < 1)))
   or (major == 21 and (patch < 13 or (patch == 13 and build < 1)))
   or (major == 25 and (patch < 5  or (patch == 5  and build < 1)))
   or (major == 27 and (patch < 1  or (patch == 1  and build < 1))),
      "VULNERABLE_VERSION",
   else: if(major >= 18 and not in(major, {21, 25, 27}),
      "NON_LTS_UNPATCHED",
   else: "OK"))
| fieldsAdd cmd = process.metadata[COMMAND_LINE_ARGS]
| fieldsAdd mitigation_flag = contains(cmd, "-XX:-UseBASE64Intrinsics") or contains(cmd, "-XX:UseAVX=2")
| lookup [
    smartscapeNodes HOST
    | fields id, name, os.architecture
  ], sourceField: host.id, lookupField: id, prefix: "host."
| fields process.id = id, host = host.name, host.arch = host.os.architecture,
         process = name, process_group = dt.process_group.detected_name,
         java.edition, java.version, status, mitigation_flag
| sort mitigation_flag asc, status asc, host asc`;

/** Total number of processes in the environment (Java or not). */
export const TOTAL_PROCESS_QUERY = `smartscapeNodes PROCESS
| summarize total = count()`;

export type Status = "VULNERABLE_VERSION" | "NON_LTS_UNPATCHED" | "OK";

export interface JavaProcessRow {
  "process.id": string;
  host: string | null;
  "host.arch": string | null;
  process: string | null;
  process_group: string | null;
  "java.edition": string | null;
  "java.version": string | null;
  status: Status;
  mitigation_flag: boolean | null;
}
