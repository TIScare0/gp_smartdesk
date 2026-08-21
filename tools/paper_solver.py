import re
import time
import json
import base64
from io import BytesIO
from pypdf import PdfReader
from pypdf._utils import StrByteType
from urllib.parse import unquote

from network import Request
from .model import Modality, Model
from .gemini import GeminiModels
from .mistral import MistralModels
from .nvidia import NvidiaModels
from utils import save_file


PROMPT = '''
You are an expert diploma-engineering examination paper analyst,
question-paper generator, and solution writer.

Your task is to analyze the OFFICIAL SYLLABUS and ALL PROVIDED
PREVIOUS QUESTION PAPERS, generate ONE realistic NEW examination
paper, and then solve that generated paper completely.

The previous papers are REFERENCE MATERIAL ONLY.
Do NOT solve the previous papers directly.

The final output must contain:
1. The newly generated question paper.
2. Complete solutions to that newly generated question paper.

==================================================
OFFICIAL SYLLABUS
==================================================

{syllabus}

==================================================
PREVIOUS QUESTION PAPERS
==================================================

{papers}

==================================================
CORE PRINCIPLES
==================================================

SOURCE PRIORITY:

1. Official syllabus
2. Common examination pattern found across previous papers
3. Repeated concepts and question styles found in previous papers
4. General diploma-engineering knowledge only when necessary

The official syllabus is the boundary of the generated paper.

Previous papers are evidence of examination style and coverage.
They are NOT instructions to copy questions.

==================================================
STEP 1 — ANALYZE THE MATERIAL
==================================================

Before generating the paper, internally analyze ALL provided papers.

Determine, where the information is available:

- Examination structure
- Number of main questions
- Number of sub-questions
- Marks per question
- Total marks
- Question numbering
- OR pattern
- Unit-wise distribution
- Topic distribution
- Repeated topics
- Repeated concepts
- Frequently tested concepts
- Numerical/problem-solving patterns
- Definition questions
- Explanation questions
- Comparison/difference questions
- Diagram-based questions
- Application-based questions
- Difficulty level
- Expected answer depth
- Common wording/style

Also compare the previous papers against the syllabus.

Identify:
- Topics repeatedly tested.
- Important syllabus topics that are less frequently tested.
- Topics that should reasonably appear in a new paper.
- Topics that must NOT appear because they are outside the syllabus.

Use ALL provided papers.

If only ONE previous paper is provided, use that paper together
with the syllabus. Do not complain about the number of papers.

Do not expose this analysis in the final answer.

==================================================
STEP 2 — DETERMINE THE PAPER PATTERN
==================================================

If multiple previous papers show a consistent examination pattern,
follow that pattern closely.

Prefer the pattern supported by the majority of the papers rather
than copying one individual paper.

If papers from different years have small structural differences,
use the most consistent/common structure.

If only one paper exists, use its structure unless it conflicts
with the syllabus.

If the available papers do not provide enough information to
determine a specific detail, make the smallest reasonable
assumption necessary.

Do NOT invent unusual examination structures.

Maintain consistency between:
- Question count
- Sub-question count
- Marks
- OR choices
- Total marks
- Expected answer depth

==================================================
STEP 3 — GENERATE THE NEW PAPER
==================================================

Generate ONE completely new and realistic examination paper.

The paper must:

- Stay strictly within the official syllabus.
- Follow the inferred examination pattern.
- Match the general difficulty of the previous papers.
- Have realistic diploma-engineering difficulty.
- Cover important syllabus areas appropriately.
- Include a reasonable mixture of easy, moderate, and difficult
  questions.
- Avoid excessive repetition of the same concept.
- Test understanding rather than only memorization.
- Use terminology consistent with the syllabus.
- Use realistic industrial/application contexts where appropriate.
- Preserve the established OR-question style.
- Preserve the established marks pattern.

Do NOT simply copy previous questions.

Do NOT combine previous questions mechanically.

Do NOT create a question merely by changing a few words from an
old question.

A new question may test the same concept as an old question, but
its wording, context, structure, or application should be meaningfully
different.

Do NOT introduce:
- Topics outside the syllabus.
- Advanced concepts not required by the syllabus.
- Unnecessary university-level material.
- Unrelated formulas or technologies.
- Unsupported technical specifications.

==================================================
QUESTION QUALITY RULES
==================================================

Every generated question must satisfy ALL of the following:

1. It must be answerable from the syllabus and standard knowledge
   appropriate to the course level.

2. It must have a clear expected answer.

3. Its difficulty must be appropriate for the assigned marks.

4. It must not contain ambiguous wording.

5. It must not ask for information unrelated to the syllabus.

6. Numerical questions must contain sufficient data to solve them.

7. If a numerical answer is expected, the required values and units
   must be provided.

8. Do not create impossible or under-specified numerical problems.

9. Do not ask for a diagram unless the requested diagram can be
   meaningfully described.

10. Do not repeat essentially identical questions in the same paper.

==================================================
MARKS AND ANSWER DEPTH
==================================================

Match the expected answer length and depth to the marks.

General guidance:

1-2 marks:
- Definition
- Formula
- Short fact
- Very short explanation

3-4 marks:
- Definition + explanation
- Several important points
- Small example where appropriate

5-6 marks:
- Detailed explanation
- Components/steps/working
- Example/application
- Diagram description where appropriate

7+ marks:
- Comprehensive explanation
- Working/principle
- Components/steps
- Advantages/disadvantages or applications where relevant
- Diagram/flow description where appropriate
- Appropriate technical detail

Do not make every answer unnecessarily long.

Do not give a 10-mark answer to a 2-mark question.

==================================================
STEP 4 — SOLVE THE GENERATED PAPER
==================================================

After generating the paper, solve EVERY question in it.

The solutions must correspond EXACTLY to the generated questions.

Rules:

1. Preserve question numbering exactly.

2. Preserve all sub-question labels exactly.

3. Preserve OR choices exactly.

4. Solve BOTH sides of every OR.

5. Do not skip any question.

6. Do not merge separate questions.

7. Do not merge separate OR choices.

8. Do not change the question while answering it.

9. Answer at the expected diploma-engineering level.

10. Use terminology consistent with the syllabus.

11. Give technically correct answers.

12. Give enough detail for the marks assigned.

13. Avoid unnecessary information.

==================================================
THEORY QUESTION RULES
==================================================

For definition questions:

Give:
- Correct definition.
- One short clarification if useful.

For explanation questions:

Use a logical structure such as:
- Definition/introduction
- Principle/working
- Main components or steps
- Example/application where useful

For "differentiate between":

Use clear point-by-point comparisons.

For "list/state":

Give only the required points.

For "advantages/disadvantages":

Give clearly separated points.

For "working/principle":

Explain the sequence logically from input to output.

For application questions:

Explain how the concept applies to the stated industrial situation.

==================================================
NUMERICAL QUESTION RULES
==================================================

For every numerical problem, use:

Given:
...

Formula:
...

Substitution:
...

Calculation:
...

Answer:
...

Always include units where applicable.

Check the calculation before producing the final answer.

Do not invent missing values.

If a numerical problem cannot be solved because the generated
question accidentally lacks required information, do NOT fabricate
data. Correct the generated question before finalizing the paper.

==================================================
DIAGRAM QUESTION RULES
==================================================

If the question asks for a diagram:

Do not claim that an actual image has been generated.

Instead provide:

Diagram:
[Clear text description of the diagram]

Then explain:
- Main components
- Connections
- Flow/direction
- Important labels

Use simple ASCII diagrams only when they genuinely improve clarity.

==================================================
TECHNICAL ACCURACY RULES
==================================================

This is extremely important.

Do NOT invent:

- Numerical values
- Percentages
- Efficiency values
- Operating limits
- Frequency thresholds
- Temperature/pressure ratings
- Accuracy values
- Performance claims
- Standards
- Manufacturer specifications
- Component ratings
- Industrial specifications

unless they are explicitly provided by the question, syllabus,
or reference material, or can be directly calculated.

Do not make absolute technical claims when the concept depends on
system configuration or operating conditions.

Do not introduce components that change the system being described.

For example:

If a question asks about a SIMPLE Rankine cycle, do not add
regeneration/feedwater heaters unless specifically requested.

If a concept has multiple valid configurations, describe the
configuration relevant to the syllabus rather than presenting one
configuration as universally true.

If a specific fact cannot be established from the supplied material,
prefer a general technically correct explanation over an invented
specific fact.

==================================================
SELF-CHECK BEFORE FINAL OUTPUT
==================================================

Before producing the final response, internally verify:

PAPER CHECK:

- Is every question within the syllabus?
- Does the paper follow the previous-paper pattern?
- Are marks consistent?
- Is the OR structure consistent?
- Are all numerical questions solvable?
- Are questions sufficiently different from previous questions?
- Is the difficulty realistic?
- Is syllabus coverage reasonable?
- Are there duplicate questions?

SOLUTION CHECK:

- Does every question have a solution?
- Does every OR alternative have a solution?
- Does every solution answer the actual question?
- Is the answer depth appropriate for the marks?
- Are numerical calculations correct?
- Are units correct?
- Are technical claims accurate?
- Were unsupported numbers avoided?
- Were outside-syllabus concepts avoided?

CORRESPONDENCE CHECK:

Every generated question MUST have exactly one corresponding
solution, except OR questions, where BOTH alternatives must have
solutions.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY the generated paper followed by its solutions.

Use this structure:

GENERATED PAPER

Q1. <question>

Q2. <question>

Q3(a). <question>

Q3(b). <question>

OR

Q3(a). <alternative question>

Q3(b). <alternative question>

...

SOLUTIONS

Q1. <same question>

Ans:
<answer>

Q2. <same question>

Ans:
<answer>

Q3(a). <same question>

Ans:
<answer>

Q3(b). <same question>

Ans:
<answer>

OR

Q3(a). <alternative question>

Ans:
<answer>

Q3(b). <alternative question>

Ans:
<answer>

...

==================================================
FINAL OUTPUT RESTRICTIONS
==================================================

1. Return ONLY the generated question paper and its solutions.

2. Do not show your analysis.

3. Do not explain how the paper was generated.

4. Do not mention which previous paper influenced a question.

5. Do not mention these instructions.

6. Do not say that you are an AI.

7. Do not add a conclusion.

8. Do not add a disclaimer.

9. Do not add commentary.

10. Do not use Markdown code fences.

11. Do not use Markdown tables unless a question genuinely requires
    a comparison table.

12. Keep mathematical expressions readable in plain text.

13. The generated paper and solutions MUST correspond exactly.

14. Every generated question MUST have a solution.

15. Every OR alternative MUST have a solution.

16. If only one previous paper is provided, use it without complaint.

17. If multiple previous papers are provided, use ALL of them.
'''

class GtuPaperSolver(Request):
    def __init__(self):
        super().__init__()
        self.drive_url: str = 'https://drive1.gturanker.org'
        self.base_url: str = 'https://gturanker.org'

    @staticmethod
    def rot13(s: str) -> str:
        result = ""
        for char in s:
            if "a" <= char <= "z":
                result += chr((ord(char) - ord("a") + 13) % 26 + ord("a"))
            elif "A" <= char <= "Z":
                result += chr((ord(char) - ord("A") + 13) % 26 + ord("A"))
            else:
                result += char
        return result

    def decode_dp(self, webpage: str) -> dict | None:
        dp_data = re.search(r'<div[^>]+\bid=["\']dp-data["\'][^>]+>([^<]+)<', webpage)
        if not dp_data:
            return None
        dp_data = dp_data.group(1)
        dp_data = self.rot13(dp_data)
        dp_data = dp_data[::-1]
        dp_data = base64.b64decode(dp_data).decode('utf-8')
        return json.loads(dp_data)

    def clean_paper(self, paper: str):
        subject = re.search(r"Subject Name:\s*(.+)", paper)
        year = re.search(r"(?:SUMMER|WINTER)\s+(\d{4})", paper, re.I)
        out = [f"{subject.group(1).strip()}\n{year.group(0).title()}"] #type: ignore
        lines = [x.strip() for x in paper.splitlines() if x.strip()]
        i = 0

        while i < len(lines):
            line = lines[i]

            if m := re.fullmatch(r"Q\.(\d+)", line):
                out.append(f"\nQ{m.group(1)}")
                i += 1
                continue

            if m := re.fullmatch(r"\(([a-z])\)", line):
                part = m.group(1)
                i += 1
                question = []
                while i < len(lines) and not re.fullmatch(r"\d{2}", lines[i]):
                    question.append(lines[i])
                    i += 1
                marks = int(lines[i]) if i < len(lines) else 0
                i += 1
                out.append(f"({part}) [{marks}] {' '.join(question)}")
                while i < len(lines):
                    if (
                        re.fullmatch(r"Q\.\d+", lines[i])
                        or re.fullmatch(r"\([a-z]\)", lines[i])
                        or lines[i].upper() == "OR"
                    ):
                        break
                    i += 1
                continue

            if line.upper() == "OR":
                out.append("OR")
            i += 1
        return "\n".join(out).strip()

    def clean_syllabus(self, syllabus: str) -> str:
        lines = [
            re.sub(r"\s+", " ", x).strip()
            for x in syllabus.splitlines()
            if x.strip()
        ]

        def section(start, end):
            try:
                a = next(i for i, x in enumerate(lines) if start in x.upper())
                b = next(
                    i for i in range(a + 1, len(lines))
                    if end in lines[i].upper()
                )
                return lines[a + 1:b]
            except StopIteration:
                return []

        subject = next(
            (
                re.sub(r"^.*?:\s*", "", x)
                for x in lines
                if x.lower().startswith("subject name")
            ),
            "Unknown Subject"
        )

        co = section("COURSE OUTCOME", "TEACHING AND EXAMINATION SCHEME")
        po = section("SUGGESTED PRACTICAL EXERCISES", "MAJOR EQUIPMENT/INSTRUMENTS")
        cc = section("COURSE CONTENT", "SUGGESTED PRACTICAL EXERCISES")

        def numbered(lines, prefix, suffix):
            out = []
            i = 0

            while i < len(lines):
                m = re.match(r"^(\d+)(?:\s+(.*))?$", lines[i])
                if not m:
                    i += 1
                    continue

                number, first = m.groups()
                value = [first] if first else []
                i += 1

                while i < len(lines) and not re.match(r"^\d+(?:\s|$)", lines[i]):
                    value.append(lines[i])
                    i += 1

                value = " ".join(value)
                if suffix == "rbt":
                    value = re.sub(
                        r"\s+(?:[RUANEC](?:\s*,\s*[RUANEC])*)$",
                        "",
                        value,
                        flags=re.I,
                    )

                elif suffix == "hours":
                    value = re.sub(r"\s+\d{2}$", "", value)

                value = re.sub(r"\s+", " ", value).strip()

                if value:
                    out.append(f"{prefix}{number}: {value}")

            return out

        def course_content(lines):
            out = []
            i = 0

            while i < len(lines):
                if re.fullmatch(r"Unit-[IVX]+", lines[i], re.I):
                    unit = lines[i]
                    i += 1
                    body = []

                    while (
                        i < len(lines)
                        and not re.fullmatch(r"Unit-[IVX]+", lines[i], re.I)
                    ):
                        if not re.fullmatch(r"\d+\s+\d+\s*%", lines[i]):
                            body.append(lines[i])
                        i += 1

                    out.append(f"{unit}: {' '.join(body)}")
                else:
                    i += 1

            return out

        out = [subject, ""]

        cos = numbered(co, "CO", "rbt")
        if cos:
            out += ["COURSE OUTCOMES", *cos, ""]

        pos = numbered(po, "PO", "hours")
        if pos:
            out += ["PRACTICAL OUTCOMES", *pos, ""]

        contents = course_content(cc)
        if contents:
            out += ["COURSE CONTENT", *contents]

        return "\n".join(out).strip()

    def get_papers(self, subject_code: str) -> list | dict:
        webpage = self.download_webpage(f'{self.base_url}/papers/subject/{subject_code}')
        decoded_data = self.decode_dp(webpage)
        if not decoded_data:
            return {'error': 'Unable to get papers encrypted data'}
        papers = []
        for _hash, data in decoded_data.items():
            if not _hash:
                continue
            papers.append(data)
        return papers

    def get_syllabus(self, subject_code: str, branch_code: int, sem: int, course: str | None = 'DI') -> dict:
        webpage = self.download_webpage(f'{self.base_url}/syllabus/{course}/{branch_code}/{sem}')
        decoded_data = self.decode_dp(webpage)
        if not decoded_data:
            return {'error': 'Unable to get syllabus encrypted data'}
        for _hash, data in decoded_data.items():
            if not (_hash and data):
                continue
            sub_code = data.get('subjectCode')
            if not sub_code:
                continue
            if subject_code in sub_code:
                return data

        return {'error': f'Unable to get syllabus for {subject_code}'}

    def get_all_subjects(self, branch_code: int, sem: int, course: str | None = 'DI') -> list | dict:
        webpage = self.download_webpage(f'{self.base_url}/papers/{course}/{branch_code}/{sem}')
        decoded_data = self.decode_dp(webpage)
        if not decoded_data:
            return {'error': 'Unable to get subject data'}
        return [
            data 
            for _, data in decoded_data.items() 
            if data
        ]

    def download(self, Encodedlink: str, output_path: str | None = None) -> str | StrByteType: 
        Encodedlink = unquote(Encodedlink)
        path, _ = Encodedlink.split('&fn=', 1)
        request = self.request(
            f'{self.drive_url}',
            params={
                'path': path,
                'ts': base64.b64encode(str(int(time.time() * 1000)).encode()).decode()
            },
            stream=bool(output_path)
        )
        if output_path:
            save_file(output_path, request.content, 'wb') #type: ignore
        return BytesIO(request.content) #type: ignore

    def get_pdf_content(self, Encodedlink):
        pdf_content = ''
        pdf_reader = PdfReader(self.download(Encodedlink))
        for p in pdf_reader.pages:
            pdf_content += p.extract_text()
        return pdf_content

    def solve_paper(self, subject_code: str, branch_code: int, sem: int):
        syllabus = self.get_syllabus(subject_code, branch_code, sem)
        syllabus_link = syllabus.get('link')
        if not syllabus_link:
            return {'error': 'Failed to solve paper Unable to get Syllabus'}
        papers = self.get_papers(subject_code)
        cleaned_papaers = [
            self.clean_paper(
                self.get_pdf_content(p.get('link'))
            )
            for p in papers if p.get('link')
        ]
        cleaned_syllabus = self.clean_syllabus(self.get_pdf_content(syllabus_link))
        papers_content = '\n\n'.join(
            [
                p for p in cleaned_papaers
            ]
        )
        prompt = PROMPT.format(
            papers=papers_content,
            syllabus=cleaned_syllabus
        )

        models_ins = Model()
        models = models_ins.available_models(Modality.TEXT)
        if not models:
            return {'error': 'Unable to solve paper (limit reached)'}

        preferred = (
            MistralModels.mistral_8b,
            NvidiaModels.nemotron_3_5,
            GeminiModels.flash,
        )

        models_ins = Model()
        models = models_ins.available_models(Modality.TEXT)

        if not models:
            return {'error': 'Unable to solve paper (limit reached)'}

        available = {
            m.model_name: m
            for m in models
        }

        model = next((available[name] for name in preferred if name in available), None)
        if model is None:
            return {'error': 'Unable to solve paper (best model limit reached)'}

        model = models_ins.set_model(model.model_name)
        output = model.call_model(prompt).response
        response = output.response
        with open('output.txt', 'w', encoding='utf-8') as f:
            f.write(response)
