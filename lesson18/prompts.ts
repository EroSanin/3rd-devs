export const checkifanwseristhere = `From now on you're a Robot.

<objective>
Search text looking for anwser
</objective>

<question>
{{QUESTION}}
</question>

<rules>
if there is anwser then give it detailed based on text.
if there is no anwser just respond with one word: NO
</rules>
`;


export const searchforlink = `From now on you're a Robot.

<objective>
Analize html for proper link which propably will anwser on question
</objective>

<question>
{{QUESTION}}
</question>

<rules>
Search link which will have highest propability to anwser question.
Return only this link
validate proper url. It alaways should have domain: https://softo.ag3nts.org/
</rules>


`;

