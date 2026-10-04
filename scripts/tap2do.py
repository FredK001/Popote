"""
Turns a pgTAP test file into a single DO block that ends by raising an exception
carrying the TAP output. The exception rolls everything back (test users, data,
even CREATE EXTENSION), so tests can run against the remote project without Docker.
Used by scripts/test-db-remote.sh.
"""
import re, sys

def split_statements(sql):
    out, buf, i, n = [], [], 0, len(sql)
    quote = None
    while i < n:
        c = sql[i]
        if quote:
            if quote == "'" and c == "'":
                buf.append(c); i += 1
                if i < n and sql[i] == "'": buf.append("'"); i += 1; continue
                quote = None; continue
            if quote != "'" and sql.startswith(quote, i):
                buf.append(quote); i += len(quote); quote = None; continue
            buf.append(c); i += 1; continue
        if sql.startswith('--', i):
            j = sql.find('\n', i); i = n if j < 0 else j; continue
        if c == "'": quote = "'"; buf.append(c); i += 1; continue
        m = re.match(r'\$[A-Za-z_]*\$', sql[i:])
        if m: quote = m.group(0); buf.append(quote); i += len(quote); continue
        if c == ';':
            s = ''.join(buf).strip()
            if s: out.append(s)
            buf = []; i += 1; continue
        buf.append(c); i += 1
    s = ''.join(buf).strip()
    if s: out.append(s)
    return out

sql = open(sys.argv[1]).read()
body = []
for st in split_statements(sql):
    low = st.lower()
    if low in ('begin', 'rollback'): continue
    if low.startswith('select * from finish()'):
        body.append("out := out || E'\\n' || coalesce((select string_agg(f, E'\\n') from finish() f), '')"); continue
    if low.startswith('select set_config'):
        body.append('perform ' + st[len('select '):]); continue
    if low.startswith('select '):
        body.append("out := out || E'\\n' || coalesce((" + st + "), 'NULL')"); continue
    body.append(st)
print("do $tapdo$\ndeclare out text := '';\nbegin\n" + ';\n'.join(body) + ";\nraise exception 'TAP-RESULTS%', out;\nend\n$tapdo$;")
