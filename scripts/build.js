const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars')


console.log('building...')
//шляхи до папок настройка
const viewsDir = path.join(__dirname, '../src/views')
const pagesDir = path.join(viewsDir, 'pages')
const buildDir = path.join(__dirname, '../build')
//зчитування partials
const partialsDir = path.join(viewsDir,'partials')
//папка зі всіма скриптами
const scriptsSrcDir = path.join(__dirname, '../src/scripts')
const scriptsDestDir = path.join(buildDir, 'scripts')
 

fs.emptydirSync(buildDir) //очиститься build
//шаблонізатор повністю відштовхується від main.hbs
//всі скрипти перейдуть в білд
fs.copySync(scriptsSrcDir,scriptsDestDir )

//задача функціх проходить по контенту всього скрипта і шукати якір на сторінці
const extraScripts = (templateContent) => {
    const match = templateContent.match(/{{!--\s*scripts:\s*(\[.*?\])\s*--}}/s);
    if (match){
        try{
            return JSON.parse(match[1])
        }catch (err){
            console.log("❌ Error",err)
        }
    }
    //якщо співпадінь нема то пустий масив повертаємо
    return []
}
// допрацювати щоб вона повертала всі співпадіння для скриптів
/*console.log(extraScripts('{{!-- scripts: ["scripts/script.js"] --}}'
    '<!doctype html>\n' +
        '<html lang="en"'))*/

//загальний опис всії сторінок
const mainTemplateSource = fs.readFileSync(
    path.join(viewsDir, 'layouts/main.hbs'),
    'utf8'
);
const mainTemplate = handlebars.compile(mainTemplateSource)

//console.log(mainTemplateSource) //покаже наповнення main.hbs
//console.log(mainTemplate) //функція нашого темплейта



//зробити цей кусок скрипта більш універсалізованим в плані щоб partialsи можна було розкидати по папкам
// фактично в readdirSync має викликатись рекурсивно ще один readdirSync якщо ми зіткнулись з директорією а не файлом
// можна реалізувати до 2 рівня вкладеності папок
// щоб перебирало їх (partialси) в інших папках

fs.readdirSync(partialsDir).forEach((file)=>{
    //console.log(file)
    const partialName = path.basename(file,'.hbs');
    //отримаємо контент паршіалсів
    const partialContent = fs.readFileSync(path.join(partialsDir,file),"utf8")
    console.log(partialName)//назви файлів
    //реєструєм їх
    handlebars.registerPartial(partialName,partialContent)
})

fs.readdirSync(pagesDir).forEach(file => {
    const pageName = path.basename(file,'.hbs');
    const filePath = path.join(pagesDir,file);
    const pageContent = fs.readFileSync(filePath,"utf8")
    const pageTemplate = handlebars.compile(pageContent)

    //всі коменти перейшли в пейджтемплейт

    let scripts = extraScripts(pageContent);

    //пошук скриптів в patrials
    fs.readdirSync(partialsDir).forEach(partialsFile => {
        const partialContent = fs.readFileSync(path.join(partialsDir,partialsFile),'utf8');
        const partialName = path.basename(partialsFile, '.hbs');
        //чи міститься у нас на сторінці стрінга з вмістом {{> ${partialName}}
        const usedInPage = pageContent.includes(`{{> ${partialName}}`);
        //console.log(partialName, usedInPage)
        if (usedInPage){
            const partialScript = extraScripts(partialContent)
            //метод для зєднання масивів
            scripts = scripts.concat(partialScript)
        }
    })

    //видалення дублікатів за рахунок того що scripts ініціалізовуєтья в SET()
    //set не можуть дублюватись масиви тут тільки унікальні значення
    //scripts = new Set(scripts);
    //console.log(scripts)
    //воно виведе таке Set(2) { 'scripts/about.js', 'scripts/contactForm.js' }
    //нам треба шоб це був масив тому сет нє, використаємо spread оператор і буде нам масив
    scripts = [...new Set(scripts)];
    console.log(scripts)

    // рендер фінальної сторінки
    //ця фукція зкомпліьована і готова прийняти сторінку
    const finalHtml = mainTemplate({
        title: pageName,
        body: pageTemplate({}),
        scripts
    })
    //дозволяє створити/записати дані у файл і перший аргумент який ми прокидаєм це шлях а другий це наповнення
    fs.writeFileSync(path.join(buildDir, `${pageName}.html`),finalHtml)
})

console.log('✅ Built')