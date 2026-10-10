/* Standaardvragenlijst. Wordt eenmalig in Supabase gezet en gebruikt bij "Herstel standaard". */
/* ---------- content ---------- */
const BASE_LANGS=['en','ar','fa','ti','uk','tr','so'];
const CHECKED=['en','ar','fa','ti','uk']; // besluit 10-10: bestaande vertalingen gecontroleerd; Turks/Somalisch en wijzigingen nog niet
function T(nl,en,ar,fa,ti,uk,tr,so){const o={nl,en,ar,fa,ti,uk,tr,so,_src:{},_chk:{}};BASE_LANGS.forEach(l=>{o._src[l]=nl;o._chk[l]=CHECKED.includes(l);});return o;}
function Tnew(...a){const o=T(...a);BASE_LANGS.forEach(l=>o._chk[l]=false);return o;}

function defaultState(){return{
 langs:[
  {c:'nl',n:'Nederlands',dir:'ltr',bcp:'nl-NL'},
  {c:'en',n:'English',dir:'ltr',bcp:'en-GB'},
  {c:'ar',n:'العربية',dir:'rtl',bcp:'ar'},
  {c:'fa',n:'فارسی',dir:'rtl',bcp:'fa-IR'},
  {c:'ti',n:'ትግርኛ',dir:'ltr',bcp:'ti-ER'},
  {c:'uk',n:'Українська',dir:'ltr',bcp:'uk-UA'},
  {c:'tr',n:'Türkçe',dir:'ltr',bcp:'tr-TR'},
  {c:'so',n:'Soomaali',dir:'ltr',bcp:'so-SO'}],
 ui:{
  welkomTitel:T('Welkom!','Welcome!','أهلاً وسهلاً!','خوش آمدید!','እንቋዕ ብደሓን መጻእኩም!','Ласкаво просимо!','Hoş geldin!','Soo dhawoow!'),
  welkomTekst:T('Wat vind jij van de cursus? Wij willen het graag weten. Je vult je naam niet in. Je antwoorden zijn anoniem.','What do you think of the course? We would like to know. You do not fill in your name. Your answers are anonymous.','ما رأيك في الدورة؟ نودّ أن نعرف. لا تكتب اسمك. إجاباتك مجهولة الهوية.','نظر شما درباره دوره چیست؟ دوست داریم بدانیم. نام خود را وارد نمی‌کنید. پاسخ‌های شما ناشناس است.','ብዛዕባ እቲ ኮርስ እንታይ ትሓስብ? ክንፈልጥ ንደሊ። ስምካ ኣይትጽሕፍን ኢኻ። መልስታትካ ብዘይ ስም እዮም።','Що ти думаєш про курс? Ми хочемо знати. Своє ім’я ти не пишеш. Твої відповіді анонімні.','Kurs hakkında ne düşünüyorsun? Bunu bilmek istiyoruz. Adını yazmıyorsun. Cevapların anonimdir.','Maxaad ka qabtaa koorsada? Waxaan jeclaan lahayn inaan ogaanno. Magacaaga ma qorayso. Jawaabahaagu waa qarsoodi.'),
  taalHint:T('Druk op de knop hierboven voor een andere taal.','Press the button above for another language.','اضغط على الزر أعلاه لاختيار لغة أخرى.','برای زبان دیگر، دکمه بالا را بزنید.','ንካልእ ቋንቋ ነቲ ኣብ ላዕሊ ዘሎ መጠወቒ ጠውቕ።','Натисни кнопку вгорі, щоб вибрати іншу мову.','Başka bir dil için yukarıdaki düğmeye bas.','Riix badhanka sare si aad u doorato luqad kale.'),
  start:T('Start','Start','ابدأ','شروع','ጀምር','Почати','Başla','Bilow'),
  volgende:T('Volgende','Next','التالي','بعدی','ቀጽል','Далі','İleri','Xiga'),
  terug:T('Terug','Back','رجوع','بازگشت','ተመለስ','Назад','Geri','Dib u noqo'),
  versturen:T('Versturen','Send','إرسال','ارسال','ስደድ','Надіслати','Gönder','Dir'),
  vraagVan:T('Vraag {n} van {t}','Question {n} of {t}','السؤال {n} من {t}','سؤال {n} از {t}','ሕቶ {n} ካብ {t}','Питання {n} з {t}','Soru {n} / {t}','Su’aal {n} ee {t}'),
  typHier:T('Typ hier je antwoord','Type your answer here','اكتب إجابتك هنا','پاسخ خود را اینجا بنویسید','መልስካ ኣብዚ ጽሓፍ','Напиши свою відповідь тут','Cevabını buraya yaz','Halkan ku qor jawaabtaada'),
  eigenTaal:T('Je mag ook in je eigen taal schrijven.','You may also write in your own language.','يمكنك أيضاً الكتابة بلغتك.','می‌توانید به زبان خودتان هم بنویسید.','ብቋንቋኻ እውን ክትጽሕፍ ትኽእል ኢኻ።','Можна писати і своєю мовою.','Kendi dilinde de yazabilirsin.','Waxaad sidoo kale ku qori kartaa luqaddaada.'),
  bedanktTitel:T('Dank je wel!','Thank you!','شكراً لك!','متشکریم!','የቐንየለይ!','Дякуємо!','Teşekkürler!','Mahadsanid!'),
  jijKoos:Tnew('Jouw antwoord:','Your answer:','إجابتك:','پاسخ شما:','መልስካ:','Твоя відповідь:','Cevabın:','Jawaabtaada:'),
  bedanktTekst:T('Je antwoorden zijn verstuurd. Je kunt deze pagina nu sluiten.','Your answers have been sent. You can close this page now.','تم إرسال إجاباتك. يمكنك إغلاق هذه الصفحة الآن.','پاسخ‌های شما ارسال شد. اکنون می‌توانید این صفحه را ببندید.','መልስታትካ ተላኢኾም። ሕጂ ነዚ ገጽ ክትዓጽዎ ትኽእል ኢኻ።','Твої відповіді надіслано. Тепер можеш закрити цю сторінку.','Cevapların gönderildi. Bu sayfayı şimdi kapatabilirsin.','Jawaabahaaga waa la diray. Hadda waad xiri kartaa boggan.')
 },
 options:{
  hg:{e:'😀',t:T('Heel goed','Very good','جيد جداً','خیلی خوب','ኣዝዩ ጽቡቕ','Дуже добре','Çok iyi','Aad u wanaagsan')},
  g:{e:'🙂',t:T('Goed','Good','جيد','خوب','ጽቡቕ','Добре','İyi','Wanaagsan')},
  v:{e:'😐',t:T('Voldoende','Sufficient','مقبول','متوسط','ይኣክል','Задовільно','Yeterli','Ku filan')},
  nzg:{e:'🙁',t:T('Niet zo goed','Not so good','ليس جيداً جداً','نه چندان خوب','ብዙሕ ጽቡቕ ኣይኮነን','Не дуже добре','Pek iyi değil','Aad uma wanaagsana')},
  s:{e:'😞',t:T('Slecht','Bad','سيء','بد','ሕማቕ','Погано','Kötü','Xun')},
  alt:{e:'',t:T('Altijd','Always','دائماً','همیشه','ኩሉ ግዜ','Завжди','Her zaman','Mar walba')},
  vaak:{e:'',t:T('Vaak','Often','كثيراً','اغلب','ብዙሕ ግዜ','Часто','Sık sık','Inta badan')},
  soms:{e:'',t:T('Soms','Sometimes','أحياناً','گاهی','ሓሓሊፉ','Іноді','Bazen','Mararka qaarkood')},
  nooit:{e:'',t:T('Nooit','Never','أبداً','هرگز','ፈጺሙ','Ніколи','Hiçbir zaman','Weligiis')},
  h1:{e:'',t:T('1-3 uur per week','1–3 hours a week','1-3 ساعات في الأسبوع','1 تا 3 ساعت در هفته','1-3 ሰዓት ኣብ ሰሙን','1–3 години на тиждень','Haftada 1-3 saat','1-3 saacadood toddobaadkii')},
  h2:{e:'',t:T('3-5 uur per week','3–5 hours a week','3-5 ساعات في الأسبوع','3 تا 5 ساعت در هفته','3-5 ሰዓት ኣብ ሰሙን','3–5 годин на тиждень','Haftada 3-5 saat','3-5 saacadood toddobaadkii')},
  h3:{e:'',t:T('5-10 uur per week','5–10 hours a week','5-10 ساعات في الأسبوع','5 تا 10 ساعت در هفته','5-10 ሰዓት ኣብ ሰሙን','5–10 годин на тиждень','Haftada 5-10 saat','5-10 saacadood toddobaadkii')},
  h4:{e:'',t:T('10-15 uur per week','10–15 hours a week','10-15 ساعة في الأسبوع','10 تا 15 ساعت در هفته','10-15 ሰዓት ኣብ ሰሙን','10–15 годин на тиждень','Haftada 10-15 saat','10-15 saacadood toddobaadkii')},
  h5:{e:'',t:T('Meer dan 15 uur per week','More than 15 hours a week','أكثر من 15 ساعة في الأسبوع','بیش از 15 ساعت در هفته','ልዕሊ 15 ሰዓት ኣብ ሰሙን','Понад 15 годин на тиждень','Haftada 15 saatten fazla','In ka badan 15 saacadood toddobaadkii')},
  ja:{e:'👍',t:T('Ja','Yes','نعم','بله','እወ','Так','Evet','Haa')},
  nee:{e:'👎',t:T('Nee','No','لا','نه','ኣይፋልን','Ні','Hayır','Maya')},
  wn:{e:'🤷',t:T('Ik weet het niet','I don’t know','لا أعرف','نمی‌دانم','ኣይፈልጥን','Я не знаю','Bilmiyorum','Ma garanayo')},
  el:{e:'',t:T('Elke les','Every lesson','في كل درس','هر جلسه','ኣብ ነፍሲ ወከፍ ትምህርቲ','Кожного уроку','Her derste','Cashar kasta')},
  ew:{e:'',t:T('Elke week','Every week','كل أسبوع','هر هفته','ነፍሲ ወከፍ ሰሙን','Щотижня','Her hafta','Toddobaad kasta')},
  meer:{e:'⬆️',t:Tnew('Nee, ik wil meer','No, I want more','لا، أريد المزيد','نه، بیشتر می‌خواهم','ኣይፋልን፡ ዝያዳ እደሊ','Ні, я хочу більше','Hayır, daha fazla istiyorum','Maya, waxaan rabaa wax badan')},
  minder:{e:'⬇️',t:Tnew('Nee, ik wil minder','No, I want less','لا، أريد أقل','نه، کمتر می‌خواهم','ኣይፋልን፡ ውሑድ እደሊ','Ні, я хочу менше','Hayır, daha az istiyorum','Maya, waxaan rabaa wax ka yar')},
  bn:{e:'',t:T('Bijna nooit','Almost never','نادراً جداً','تقریباً هرگز','ዳርጋ ፈጺሙ','Майже ніколи','Neredeyse hiç','Ku dhowaad weligiis')}
 },
 scales:{
  kwal5:{n:'Kwaliteit (5)',o:['hg','g','v','nzg','s']},
  kwal4:{n:'Kwaliteit (4)',o:['g','v','nzg','s']},
  vaak4:{n:'Altijd – nooit',o:['alt','vaak','soms','nooit']},
  uren6:{n:'Huiswerkuren',o:['nooit','h1','h2','h3','h4','h5']},
  jnw:{n:'Ja / nee / weet niet',o:['ja','nee','wn']},
  doet5:{n:'Elke les – nooit',o:['el','ew','soms','bn','nooit']},
  genoeg3:{n:'Genoeg? (meer / minder / ja)',o:['meer','minder','ja']}
 },
 questions:[
  {id:'q1',type:'choice',scale:'kwal5',req:true,t:T('Hoe vind je de cursus?','What do you think of the course?','ما رأيك في الدورة؟','نظر شما درباره این دوره چیست؟','ብዛዕባ እቲ ኮርስ እንታይ ትሓስብ?','Як тобі курс?','Kursu nasıl buluyorsun?','Sidee u aragtaa koorsada?')},
  {id:'q2',type:'matrix',scale:'kwal4',req:true,t:T('Wat vind je van:','What do you think of:','ما رأيك في:','نظر شما درباره:','ብዛዕባ እዚ እንታይ ትሓስብ:','Що ти думаєш про:','Bunlar hakkında ne düşünüyorsun:','Maxaad ka qabtaa:'),rows:[
   {id:'r1',t:T('Het lokaal','The classroom','قاعة الدراسة','کلاس درس','እቲ ክፍሊ','Навчальний клас','Sınıf','Fasalka')},
   {id:'r2',t:T('Het lesmateriaal (online en de boeken)','The teaching materials (online and the books)','المواد التعليمية (عبر الإنترنت والكتب)','مواد آموزشی (آنلاین و کتاب‌ها)','ናውቲ ትምህርቲ (ኦንላይንን መጻሕፍትን)','Навчальні матеріали (онлайн і книжки)','Ders materyalleri (online ve kitaplar)','Agabka waxbarashada (online iyo buugaagta)')},
   {id:'r3',t:T('Aantal cursisten in de klas','The number of students in the class','عدد الطلاب في الصف','تعداد شاگردان در کلاس','ብዝሒ ተማሃሮ ኣብ ክፍሊ','Кількість учнів у класі','Sınıftaki öğrenci sayısı','Tirada ardayda fasalka')},
   {id:'r4',t:T('Aantal lesuren per week','The number of lesson hours per week','عدد ساعات الدرس في الأسبوع','تعداد ساعت‌های درس در هفته','ብዝሒ ሰዓታት ትምህርቲ ኣብ ሰሙን','Кількість годин уроків на тиждень','Haftalık ders saati sayısı','Tirada saacadaha casharka toddobaadkii')}]},
  {id:'q3',type:'matrix',scale:'vaak4',req:true,t:Tnew('Hoe vaak is dit zo?','How often is this true?','كم مرة يكون هذا صحيحاً؟','این چند وقت یک‌بار درست است؟','እዚ ክንደይ ግዜ ከምዚ እዩ?','Як часто це так?','Bu ne sıklıkla doğru?','Intee jeer ayay sidan tahay?'),rows:[
   {id:'r1',t:T('De docent heeft zich goed voorbereid aan het begin van elke les','The teacher is well prepared at the start of every lesson','المعلم مستعد جيداً في بداية كل درس','معلم در شروع هر درس به خوبی آماده است','መምህር ኣብ መጀመርታ ነፍሲ ወከፍ ትምህርቲ ጽቡቕ ተዳልዩ እዩ','Викладач добре підготовлений на початку кожного уроку','Öğretmen her dersin başında iyi hazırlanmış','Macallinku si fiican ayuu ugu diyaar yahay bilowga cashar kasta')},
   {id:'r2',t:T('De docent legt goed uit','The teacher explains well','المعلم يشرح جيداً','معلم خوب توضیح می‌دهد','መምህር ጽቡቕ ገይሩ የረድእ','Викладач добре пояснює','Öğretmen iyi açıklıyor','Macallinku si fiican ayuu wax u sharxaa')},
   {id:'r3',t:T('De docent stimuleert de cursisten om mee te doen in de les','The teacher encourages students to take part in the lesson','المعلم يشجع الطلاب على المشاركة في الدرس','معلم شاگردان را به شرکت در درس تشویق می‌کند','መምህር ንተማሃሮ ኣብ ትምህርቲ ክሳተፉ የተባብዕ','Викладач заохочує учнів брати участь в уроці','Öğretmen öğrencileri derse katılmaya teşvik ediyor','Macallinku wuxuu ardayda ku dhiirrigeliyaa inay casharka ka qayb qaataan')},
   {id:'r4',t:T('De docent maakt de les leuk en interessant','The teacher makes the lesson fun and interesting','المعلم يجعل الدرس ممتعاً ومثيراً للاهتمام','معلم درس را جذاب و جالب می‌کند','መምህር ነቲ ትምህርቲ ባህ ዘብልን ዘገድስን ይገብሮ','Викладач робить урок веселим і цікавим','Öğretmen dersi eğlenceli ve ilginç yapıyor','Macallinku casharka wuxuu ka dhigaa mid xiiso leh oo madadaalo leh')},
   {id:'r5',t:T('De docent helpt als ik iets niet begrijp','The teacher helps when I don’t understand something','المعلم يساعدني إذا لم أفهم شيئاً','وقتی چیزی را نمی‌فهمم، معلم کمک می‌کند','ገለ ነገር ምስ ዘይርድኣኒ መምህር ይሕግዘኒ','Викладач допомагає, коли я чогось не розумію','Bir şeyi anlamadığımda öğretmen yardım ediyor','Macallinku wuu i caawiyaa marka aanan wax fahmin')},
   {id:'r6',t:T('De docent organiseert de lestijd goed','The teacher organises the lesson time well','المعلم ينظم وقت الدرس بشكل جيد','معلم زمان کلاس را خوب مدیریت می‌کند','መምህር ግዜ ትምህርቲ ጽቡቕ ገይሩ የወሃህድ','Викладач добре організовує час уроку','Öğretmen ders zamanını iyi düzenliyor','Macallinku si fiican ayuu u habeeyaa waqtiga casharka')},
   {id:'r7',t:T('Ik voel me goed in de klas met de docent','I feel good in the class with the teacher','أشعر بالراحة في الصف مع المعلم','در کلاس با معلم احساس خوبی دارم','ምስ መምህር ኣብ ክፍሊ ጽቡቕ ይስምዓኒ','Мені добре в класі з викладачем','Sınıfta öğretmenle kendimi iyi hissediyorum','Waxaan dareemayaa raaxo fasalka marka aan la joogo macallinka')}]},
  {id:'q4',type:'stars',req:false,t:T('Hoe beoordeel je de algemene lesprestaties van de docent?','How do you rate the teacher’s teaching overall?','كيف تقيّم أداء المعلم في التدريس بشكل عام؟','عملکرد کلی معلم در تدریس را چگونه ارزیابی می‌کنید؟','ብሓፈሻ ኣገባብ ምምሃር መምህር ከመይ ትግምግሞ?','Як ти загалом оцінюєш викладання вчителя?','Öğretmenin genel ders performansını nasıl değerlendiriyorsun?','Guud ahaan sidee u qiimeysaa sida macallinku wax u dhigo?'),
   low:T('Slecht','Bad','سيء','بد','ሕማቕ','Погано','Kötü','Xun'),high:T('Heel goed','Very good','جيد جداً','خیلی خوب','ኣዝዩ ጽቡቕ','Дуже добре','Çok iyi','Aad u wanaagsan')},
  {id:'q5',type:'choice',scale:'uren6',req:true,t:T('Hoeveel uur per week doe jij huiswerk?','How many hours a week do you do homework?','كم ساعة في الأسبوع تقوم بواجباتك المنزلية؟','چند ساعت در هفته تکالیف انجام می‌دهید؟','ኣብ ሰሙን ክንደይ ሰዓት ናይ ገዛ ዕዮ ትሰርሕ?','Скільки годин на тиждень ти робиш домашнє завдання?','Haftada kaç saat ödev yapıyorsun?','Immisa saacadood ayaad toddobaadkii qabataa shaqada guriga?')},
  {id:'q5b',type:'choice',scale:'genoeg3',req:true,sub:true,t:Tnew('Vind je dat genoeg?','Do you think that is enough?','هل تعتقد أن هذا كافٍ؟','به نظر شما این کافی است؟','እዚ ይኣክል ኢልካ ትሓስብ ዶ?','Чи вважаєш ти, що цього достатньо?','Bunun yeterli olduğunu düşünüyor musun?','Ma u aragtaa inay ku filan tahay?')},
  {id:'q6',type:'choice',scale:'jnw',req:true,t:T('Heb jij genoeg geleerd om je inburgering te halen?','Have you learned enough to pass your civic integration (inburgering)?','هل تعلمت ما يكفي لتنجح في الاندماج (inburgering)؟','آیا به اندازه کافی یاد گرفته‌اید تا اینبورخرینگ (ادغام) را بگذرانید؟','ውህደት (inburgering) ንምሕላፍ እኹል ተማሂርካ ዲኻ?','Чи достатньо ти навчився, щоб скласти інтеграцію (inburgering)?','Uyum sürecini (inburgering) tamamlamak için yeterince öğrendin mi?','Ma baratay wax ku filan si aad u gudubto is-dhexgalka (inburgering)?')},
  {id:'q7',type:'matrix',scale:'doet5',req:true,t:T('Doet de docent deze dingen?','Does the teacher do these things?','هل يقوم المعلم بهذه الأشياء؟','آیا معلم این کارها را انجام می‌دهد؟','መምህር ነዚኦም ነገራት ይገብሮም ድዩ?','Чи робить викладач ці речі?','Öğretmen bunları yapıyor mu?','Macallinku ma sameeyaa waxyaabahan?'),rows:[
   {id:'r1',t:T('Zegt hoe ik moet leren','Tells me how to study','يخبرني كيف أتعلم','به من می‌گوید چطور یاد بگیرم','ከመይ ገይረ ክመሃር ከም ዘለኒ ይነግረኒ','Пояснює, як мені вчитися','Nasıl çalışmam gerektiğini söylüyor','Wuxuu ii sheegaa sida aan wax u barto')},
   {id:'r2',t:T('Gebruikt het smartboard voor uitleg of spellen','Uses the smartboard for explanations or games','يستخدم السبورة الذكية للشرح أو الألعاب','از تخته هوشمند برای توضیح یا بازی استفاده می‌کند','ንመብርሂ ወይ ጸወታ ስማርትቦርድ ይጥቀም','Використовує смартдошку для пояснень або ігор','Açıklama veya oyunlar için akıllı tahtayı kullanıyor','Wuxuu smartboard-ka u isticmaalaa sharaxaad ama ciyaaro')},
   {id:'r3',t:T('Doet spellen op het smartboard (Kahoot, Quizlet, Wordwall)','Plays games on the smartboard (Kahoot, Quizlet, Wordwall)','يلعب ألعاباً على السبورة الذكية (Kahoot, Quizlet, Wordwall)','روی تخته هوشمند بازی می‌کند (Kahoot، Quizlet، Wordwall)','ኣብ ስማርትቦርድ ጸወታታት ይገብር (Kahoot, Quizlet, Wordwall)','Проводить ігри на смартдошці (Kahoot, Quizlet, Wordwall)','Akıllı tahtada oyunlar oynatıyor (Kahoot, Quizlet, Wordwall)','Wuxuu ciyaaro ku sameeyaa smartboard-ka (Kahoot, Quizlet, Wordwall)')},
   {id:'r4',t:T('Geeft samenwerkopdrachten','Gives group tasks','يعطي مهام عمل جماعي','تکالیف گروهی می‌دهد','ናይ ሓባር ዕዮ ይህብ','Дає завдання для спільної роботи','Grup çalışması veriyor','Wuxuu bixiyaa hawlo wadajir ah')},
   {id:'r5',t:T('Geeft doe-opdrachten voor buiten','Gives practical tasks to do outside','يعطي مهام عملية خارج الصف','تکالیف عملی برای بیرون از کلاس می‌دهد','ካብ ክፍሊ ወጻኢ ዝግበር ተግባራዊ ዕዮ ይህብ','Дає практичні завдання поза класом','Dışarıda yapılacak uygulamalı görevler veriyor','Wuxuu bixiyaa hawlo ficil ah oo bannaanka lagu sameeyo')}]},
  {id:'q8',type:'choice',scale:'jnw',req:true,t:T('Voldeed de cursus aan je verwachting?','Did the course meet your expectations?','هل كانت الدورة كما توقعت؟','آیا دوره مطابق انتظار شما بود؟','እቲ ኮርስ ከም ትጽቢትካ ነይሩ ድዩ?','Чи виправдав курс твої очікування?','Kurs beklentilerini karşıladı mı?','Koorsadu ma noqotay sidii aad filaysay?')},
  {id:'q9',type:'stars',req:true,t:T('Zou je de cursus aan een vriend adviseren?','Would you recommend the course to a friend?','هل تنصح صديقاً بهذه الدورة؟','آیا این دوره را به یک دوست پیشنهاد می‌کنید؟','ነዚ ኮርስ ንዓርክኻ ምመኸርካዮ ዲኻ?','Чи порадив би ти цей курс другові?','Bu kursu bir arkadaşına tavsiye eder misin?','Ma kula talin lahayd saaxiib koorsadan?'),
   low:T('Nee','No','لا','نه','ኣይፋልን','Ні','Hayır','Maya'),high:T('Ja','Yes','نعم','بله','እወ','Так','Evet','Haa')},
  {id:'q10',type:'open',req:false,t:T('Wat kunnen wij nog verbeteren?','What can we improve?','ما الذي يمكننا تحسينه؟','چه چیزی را می‌توانیم بهتر کنیم؟','እንታይ ከነመሓይሽ ንኽእል?','Що ми можемо покращити?','Neyi daha iyi yapabiliriz?','Maxaan hagaajin karnaa?')}
 ],
 vestigingen:[
  {c:'ALK',n:'Alkmaar',groepen:['B1 di-do ochtend','A2 ma-wo middag','Z-route vrijdag']},
  {c:'HHW',n:'Heerhugowaard',groepen:['A2 di-do ochtend','B1 ma-wo avond']},
  {c:'BEV',n:'Beverwijk',groepen:['A1 ma-wo-vr ochtend','B1 di-do middag']},
  {c:'VEL',n:'Velsen',groepen:['A2 ma-wo ochtend','B1 di-do middag']},
  {c:'HRN',n:'Hoorn',groepen:['A2 ma-wo ochtend','Z-route di-do']}]
};}
