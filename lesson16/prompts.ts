export const initialPhoto = `From now on you're a Robot.

<objective>
Analize response and retrive urls of images.
</objective>

<rules>
- search for name of image 
- search for url with image
- search for base url to combaine it with image name
</rules>
<example>
text: Siemano! Powiedzieli Ci, że mam fotki. No mam! Oto one: https://centrala.ag3nts.org/dane/barbara/IMG_559.PNG https://centrala.ag3nts.org/dane/barbara/IMG_1410.PNG https://centrala.ag3nts.org/dane/barbara/IMG_1443.PNG https://centrala.ag3nts.org/dane/barbara/IMG_1444.PNG. Pamiętaj, że zawsze mogę poprawić je dla Ciebie (polecenia: REPAIR/DARKEN/BRIGHTEN).
result: 
https://centrala.ag3nts.org/dane/barbara/IMG_559.PNG,
https://centrala.ag3nts.org/dane/barbara/IMG_1410.PNG, 
https://centrala.ag3nts.org/dane/barbara/IMG_1443.PNG,
https://centrala.ag3nts.org/dane/barbara/IMG_1444.PNG

text:No kogo ja widzę! Numer piąty!. Oto fotki, które udało nam się zdobyć. IMG_559.PNG, IMG_1410.PNG, IMG_1443.PNG, IMG_1444.PNG. Wszystkie siedzą sobie tutaj: https://centrala.ag3nts.org/dane/barbara/. Pamiętaj, że zawsze mogę poprawić je dla Ciebie (polecenia: REPAIR/DARKEN/BRIGHTEN).
result:
https://centrala.ag3nts.org/dane/barbara/IMG_559.PNG,
https://centrala.ag3nts.org/dane/barbara/IMG_1410.PNG, 
https://centrala.ag3nts.org/dane/barbara/IMG_1443.PNG,
https://centrala.ag3nts.org/dane/barbara/IMG_1444.PNG

text: Pyk, pyk, pyk, pytk jako tako i fajrant! Dałem z siebie całe 30% - proszę: IMG_1443_FT12.PNG
result:
https://centrala.ag3nts.org/dane/barbara/IMG_1443_FT12.PNG,


text: Się robi! Czekaj... czekaj... o! Usunąłem uszkodzenia. Proszę: IMG_559_FGR4.PNG
result:  https://centrala.ag3nts.org/dane/barbara/IMG_559_FGR4.PNG
</example>

`;


export const imageAnalizePrompt = `From now on you're a Robot.

<objective>
Analize quality of phoyo
</objective>

<rules>
Chose Status for File
* REPAIR  (for noise/glitchy).
* DARKEN (for too bright).
* BRIGHTEN (for too dark).
* KONIEC if photo is of good quality or not suitable for further processing.
</rules>

<example>
If Photo of filename Img_234 is too bright.
DARKEN 

IF Photo of filename IMG_666 has a lot of noise.
REPAIR 

If Photo is ok quaility
KONIEC
</example>


`;

