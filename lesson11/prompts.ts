export const textAnalizePrompt = `From now on you're a Robot.

<objective>
Analize raport and create keywords using rules.
</objective>

<rules>
- Analyze the content of the report. Identify key information: what happened, where, who was involved, what items/technology occurred.
- Use facts related to the report currently being processed. The most common link will be the people mentioned in the report and in the facts.
- Also use the information from the report file name.
- IF Raport describe a person, add his proffesion and skills as keyword.
- Generate a list of keywords.
        - The keywords must be in Polish.
        - They must be in the nominative (e.g., “teacher”, “programmer”, not ‘teacher’, “programmers”).
        - Words should be separated by commas (e.g. word1,word2,word3).
        - The list should accurately describe the report, taking into account the content of the report, related facts and information from the file name.
        - There can be any number of keywords for a given report.
</rules>
<example>
Raport: Stefan Nowak was found near base.
Facts: Stefan Nowak is a soldier. He can speak in english.
Anwser: Stefan Nowak, soldier, base, speak english


Raport: Aleksander Kowalski was attacked.
Facts: Aleksander Kowalski is civil. He is a doctor. He can swim quite fast.
Anwser: Aleksander Kowalski, civil, doctor, attack, swim
</example>

<facts>
{{facts}}
</facts>

<fileName>
{{fileName}}
</fileName>
`;


export const factsAnalizePrompt = `From now on you're a Robot.

<objective>
Analize facts and create short description.
</objective>

<rules>
Link name and surname to proffesion and skills.
Create shorted description.
Analyze the content of the fact. Identify key information: what happened, where, who was involved, what items/technology occurred.
Search for name of technology.
</rules>
`;

