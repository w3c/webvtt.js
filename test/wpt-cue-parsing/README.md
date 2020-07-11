Tests extracted from [WPT](https://github.com/web-platform-tests/wpt/blob/master/webvtt/parsing/cue-text-parsing/) by patching the buildtests.py file with:
```diff
--- a/webvtt/parsing/cue-text-parsing/buildtests.py
+++ b/webvtt/parsing/cue-text-parsing/buildtests.py
@@ -1,8 +1,8 @@
 #!/usr/bin/python3
 
 import os
-import urllib.parse
 import hashlib
+import json
 
 doctmpl = """\
 <!doctype html>
@@ -24,8 +24,6 @@ runTests([
 
 testobj = "{name:'%s', input:'%s', expected:'%s'}"
 
-def appendtest(tests, input, expected):
-    tests.append(testobj % (hashlib.sha1(input.encode('UTF-8')).hexdigest(), urllib.parse.quote(input[:-1]),  urllib.parse.quote(expected[:-1])))
 
 files = os.listdir('dat/')
 for file in files:
@@ -36,12 +34,13 @@ for file in files:
     input = ""
     expected = ""
     state = ""
+    cues = []
     with open('dat/'+file, "r") as f:
         while True:
             line = f.readline()
             if not line:
                 if state != "":
-                    appendtest(tests, input, expected)
+                    cues.append({"text": input, "expectedTree": expected})
                     input = ""
                     expected = ""
                     state = ""
@@ -50,22 +49,38 @@ for file in files:
             if line[0] == "#":
                 state = line
                 if line == "#document-fragment\n":
-                    expected += bytes(line, 'UTF-8').decode('unicode-escape')
+                    pass
+                    #expected += bytes(line, "utf-8").decode('unicode_escape')
+                elif line == "#errors\n":
+                    pass
             elif state == "#data\n":
-                input += bytes(line, 'UTF-8').decode('unicode-escape')
+                add = bytes(line, "utf-8").decode('unicode_escape')
+                input += add
             elif state == "#errors\n":
                 pass
             elif state == "#document-fragment\n":
                 if line == "\n":
-                    appendtest(tests, input, expected)
+                    cues.append({"text": input, "expectedTree": expected})
                     input = ""
                     expected = ""
                     state = ""
                 else:
-                    expected += bytes(line, 'UTF-8').decode('unicode-escape')
+                    expected += bytes(line, "utf-8").decode('unicode_escape')
             else:
                 raise Exception("failed to parse file %s:%s (state: %s)" % (file, line, state))
 
     name = os.path.splitext(file)[0]
     with open('tests/'+name+".html", "w") as out:
         out.write(doctmpl % (name, ",\n".join(tests)))
+
+
+    with open('tests/'+name+".vtt", "w") as out:
+        out.write("WEBVTT\n\n")
+        i = 0
+        for cue in cues:
+            out.write("00:{:02d}.000 --> 00:{:02d}.000\n".format(i, i+1) )
+            out.write(cue["text"] + "\n\n")
+            i = i + 1
+
+    with open('tests/'+name+".json", "w") as out:
+        out.write(json.dumps(cues))
```
