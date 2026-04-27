const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
} = require('docx');
const fs = require('fs');

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  green:      "0D9F6F",
  greenLight: "F0FDF4",
  greenMid:   "D1FAE5",
  dark:       "1E293B",
  mid:        "475569",
  muted:      "94A3B8",
  grayLight:  "F8FAFC",
  grayMid:    "E2E8F0",
  white:      "FFFFFF",
};

// ─── Border helpers ───────────────────────────────────────────────────────────
const none   = { style: BorderStyle.NONE,   size: 0, color: C.white };
const thin   = { style: BorderStyle.SINGLE, size: 1, color: C.grayMid };
const thick  = { style: BorderStyle.SINGLE, size: 4, color: C.grayMid };
const accent = { style: BorderStyle.SINGLE, size: 16, color: C.green };

const noBorders  = { top: none,  bottom: none,  left: none,  right: none };
const allThin    = { top: thin,  bottom: thin,  left: thin,  right: thin };
const allThick   = { top: thick, bottom: thick, left: thick, right: thick };
const leftAccent = { top: thin,  bottom: thin,  left: accent, right: thin };

// ─── Spacing helpers ──────────────────────────────────────────────────────────
const CELL_MARGINS    = { top: 100, bottom: 100, left: 160, right: 160 };
const CELL_MARGINS_LG = { top: 180, bottom: 180, left: 220, right: 220 };

// ─── Text helpers ─────────────────────────────────────────────────────────────
const run = (text, opts = {}) => new TextRun({
  text, font: "Calibri", size: opts.size || 22,
  bold: opts.bold || false, italics: opts.italic || false,
  color: opts.color || C.mid, ...opts
});

const para = (children, opts = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [run(children, opts)],
  alignment: opts.align || AlignmentType.LEFT,
  spacing: { before: opts.before || 0, after: opts.after || 0 },
  numbering: opts.numbering,
  border: opts.border,
  indent: opts.indent,
});

// ─── Section headings ─────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [run(text, { bold: true, size: 32, color: C.dark })],
  spacing: { before: 400, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.green, space: 6 } }
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [run(text, { bold: true, size: 26, color: C.dark })],
  spacing: { before: 280, after: 100 },
});

const h3 = (text) => new Paragraph({
  children: [run(text, { bold: true, size: 23, color: C.green })],
  spacing: { before: 200, after: 80 },
});

// ─── Body paragraph ───────────────────────────────────────────────────────────
const body = (text, opts = {}) => para(
  [run(text, { size: 21, color: C.mid, ...opts })],
  { before: 80, after: 80, ...opts }
);

// ─── Space ────────────────────────────────────────────────────────────────────
const gap = (n = 160) => para([run("")], { before: 0, after: n });

// ─── Bullet ───────────────────────────────────────────────────────────────────
const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  children: [run(text, { size: 21, color: C.mid })],
  spacing: { before: 60, after: 60 },
});

// ─── Callout box (left green border) ─────────────────────────────────────────
const callout = (title, lines, fill = C.greenLight) => new Table({
  width: { size: 9000, type: WidthType.DXA },
  columnWidths: [9000],
  rows: [new TableRow({ children: [new TableCell({
    borders: leftAccent,
    shading: { fill, type: ShadingType.CLEAR },
    margins: CELL_MARGINS_LG,
    children: [
      ...(title ? [para([run(title, { bold: true, size: 22, color: C.dark })], { after: 80 })] : []),
      ...lines.filter(l => l !== "").map(l => para([run(l, { size: 21, color: C.mid })], { before: 60, after: 60 })),
    ]
  })]})],
});

// ─── Simple table with header ─────────────────────────────────────────────────
const mkTable = (headers, rows, colWidths) => new Table({
  width: { size: 9000, type: WidthType.DXA },
  columnWidths: colWidths,
  rows: [
    new TableRow({ children: headers.map((h, i) => new TableCell({
      borders: allThin,
      shading: { fill: C.dark, type: ShadingType.CLEAR },
      margins: CELL_MARGINS,
      width: { size: colWidths[i], type: WidthType.DXA },
      children: [para([run(h.text, { bold: true, size: 20, color: h.color || C.white })], { align: h.align || AlignmentType.LEFT })]
    })) }),
    ...rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => new TableCell({
      borders: allThin,
      shading: { fill: ri % 2 === 0 ? C.grayLight : C.white, type: ShadingType.CLEAR },
      margins: CELL_MARGINS,
      width: { size: colWidths[ci], type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      children: [para([run(cell.text, { size: 21, color: cell.color || C.mid, bold: cell.bold || false, italics: cell.italic || false })], { align: cell.align || AlignmentType.LEFT })]
    })) })),
  ],
});

// ─── Stat row ────────────────────────────────────────────────────────────────
const statRow = (stats) => new Table({
  width: { size: 9000, type: WidthType.DXA },
  columnWidths: [2900, 100, 2900, 100, 2900],
  rows: [new TableRow({ children: [
    new TableCell({
      borders: leftAccent,
      shading: { fill: C.greenLight, type: ShadingType.CLEAR },
      margins: CELL_MARGINS_LG,
      width: { size: 2900, type: WidthType.DXA },
      children: [
        para([run(stats[0].val, { bold: true, size: 52, color: C.green })], { align: AlignmentType.CENTER, after: 60 }),
        para([run(stats[0].label, { size: 19, color: C.mid })], { align: AlignmentType.CENTER }),
      ]
    }),
    new TableCell({ borders: noBorders, width: { size: 100, type: WidthType.DXA }, children: [para("")] }),
    new TableCell({
      borders: leftAccent,
      shading: { fill: C.grayLight, type: ShadingType.CLEAR },
      margins: CELL_MARGINS_LG,
      width: { size: 2900, type: WidthType.DXA },
      children: [
        para([run(stats[1].val, { bold: true, size: 52, color: C.dark })], { align: AlignmentType.CENTER, after: 60 }),
        para([run(stats[1].label, { size: 19, color: C.mid })], { align: AlignmentType.CENTER }),
      ]
    }),
    new TableCell({ borders: noBorders, width: { size: 100, type: WidthType.DXA }, children: [para("")] }),
    new TableCell({
      borders: leftAccent,
      shading: { fill: C.greenLight, type: ShadingType.CLEAR },
      margins: CELL_MARGINS_LG,
      width: { size: 2900, type: WidthType.DXA },
      children: [
        para([run(stats[2].val, { bold: true, size: 52, color: C.green })], { align: AlignmentType.CENTER, after: 60 }),
        para([run(stats[2].label, { size: 19, color: C.mid })], { align: AlignmentType.CENTER }),
      ]
    }),
  ]})],
});

// ─── NUMBERING ────────────────────────────────────────────────────────────────
const numbering = {
  config: [
    { reference: "bullets", levels: [{
      level: 0, format: LevelFormat.BULLET, text: "\u2013",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 480, hanging: 240 } }, run: { font: "Calibri", size: 22, color: C.green } }
    }]},
  ]
};

// ─── HEADER / FOOTER ──────────────────────────────────────────────────────────
const header = new Header({ children: [
  new Paragraph({
    children: [
      run("KLIMZE  ", { bold: true, size: 18, color: C.green }),
      run("x  Propuesta de Alianza \u2014 Red Code", { size: 18, color: C.muted }),
      run("\tAbril 2026", { size: 18, color: C.muted }),
    ],
    tabStops: [{ type: "right", position: 9000 }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.grayMid, space: 6 } },
    spacing: { before: 0, after: 120 }
  })
]});

const footer = new Footer({ children: [
  new Paragraph({
    children: [
      run("Confidencial \u2014 preparado para Red Code", { size: 18, color: C.muted }),
      run("\tP\u00e1gina ", { size: 18, color: C.muted }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: C.muted }),
    ],
    tabStops: [{ type: "right", position: 9000 }],
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.grayMid, space: 6 } },
    spacing: { before: 120, after: 0 }
  })
]});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering,
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Calibri", color: C.dark },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Calibri", color: C.dark },
        paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: { page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 1080, right: 1260, bottom: 1080, left: 1260 }
    }},
    headers: { default: header },
    footers: { default: footer },
    children: [

      // ══════════════════════════════════════════════════════════════════════
      // PORTADA
      // ══════════════════════════════════════════════════════════════════════
      gap(480),
      para([run("KLIMZE", { bold: true, size: 80, color: C.green })], { align: AlignmentType.CENTER, after: 100 }),
      para([run("Propuesta de Alianza Estrat\u00e9gica", { size: 36, color: C.dark })], { align: AlignmentType.CENTER, after: 80 }),
      para([run("Preparado para: Red Code  |  Abril 2026", { size: 22, color: C.muted, italic: true })], { align: AlignmentType.CENTER }),
      gap(140),
      new Table({
        width: { size: 7400, type: WidthType.DXA },
        columnWidths: [7400],
        rows: [new TableRow({ children: [new TableCell({
          borders: allThick,
          shading: { fill: C.grayLight, type: ShadingType.CLEAR },
          margins: { top: 240, bottom: 240, left: 360, right: 360 },
          children: [
            para([run("Tus clientes necesitan velocidad.", { bold: true, size: 30, color: C.dark })], { align: AlignmentType.CENTER, after: 60 }),
            para([run("Nosotros la entregamos.", { bold: true, size: 30, color: C.dark })], { align: AlignmentType.CENTER, after: 60 }),
            para([run("T\u00fa cobras la diferencia.", { bold: true, size: 30, color: C.green })], { align: AlignmentType.CENTER }),
          ]
        })]})],
      }),
      gap(120),
      para(
        [run("Preparamos esta propuesta para Red Code porque ustedes ya tienen lo que m\u00e1s cuesta construir: la confianza de clientes que necesitan crecer. Lo que presentamos aqu\u00ed es una forma concreta de monetizar ese acceso \u2014 sin cargar trabajo operativo, sin aprender tecnolog\u00eda nueva y sin asumir ning\u00fan riesgo financiero.", { size: 21, color: C.mid, italic: true })],
        { align: AlignmentType.CENTER, before: 0, after: 0 }
      ),
      gap(160),
      statRow([
        { val: "20%", label: "de comisi\u00f3n en cada setup cerrado" },
        { val: "20%", label: "de comisi\u00f3n mensual, recurrente y activa" },
        { val: "$0",  label: "de inversi\u00f3n requerida de Red Code" },
      ]),
      gap(140),
      para([run("Automatizaci\u00f3n entregada en 24\u201348 horas. Comisi\u00f3n activa mientras el cliente est\u00e9 con nosotros.", { size: 20, color: C.muted, italic: true })], { align: AlignmentType.CENTER }),
      gap(80),
      para([run("klimze.app", { bold: true, size: 22, color: C.green })], { align: AlignmentType.CENTER }),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════════════════
      // 1. QUIÉNES SOMOS
      // ══════════════════════════════════════════════════════════════════════
      h1("1. Qui\u00e9nes somos"),
      body("En Klimze hacemos que los negocios operen m\u00e1s r\u00e1pido y con menos esfuerzo manual. Nos especializamos en construir los sistemas que automatizan los procesos comerciales y operativos de una empresa: desde el primer contacto con un prospecto hasta el seguimiento, el cierre, la atenci\u00f3n postventa y los reportes internos. El resultado es un negocio que responde m\u00e1s r\u00e1pido, convierte m\u00e1s leads y libera tiempo del equipo para enfocarse en lo que realmente genera valor."),
      gap(80),
      body("Lo que diferencia nuestra forma de trabajar es la velocidad de entrega. Mientras que implementar un proceso automatizado con otras soluciones puede tomar semanas o meses, en Klimze hacemos entregas funcionales en 24 a 48 horas desde que el cliente nos da la informaci\u00f3n que necesitamos. No hacemos promesas de largo plazo para cerrar contratos. Entregamos r\u00e1pido para que los resultados hablen antes de que el cliente tenga tiempo de dudar."),
      gap(80),
      body("Operamos desde Panam\u00e1 porque conocemos el mercado local: sus herramientas, sus ritmos de decisi\u00f3n, y los sistemas que las empresas paname\u00f1as realmente usan. No adaptamos soluciones gen\u00e9ricas pensadas para mercados de otro continente. Construimos para lo que existe aqu\u00ed, con integraciones a las plataformas que los negocios locales ya tienen activas."),
      gap(80),
      body("El servicio mensual no es soporte t\u00e9cnico pasivo. Es mantenimiento activo: monitoreamos que los procesos automatizados est\u00e9n funcionando, hacemos ajustes cuando cambia alguna variable del negocio del cliente, y respondemos cuando algo requiere atenci\u00f3n. El cliente no gestiona nada. Para Red Code, esto significa que los clientes referidos no tienen razones para cancelar: el servicio sigue siendo \u00fatil y actualizado mes a mes."),
      gap(100),
      callout("Entrega en 24\u201348 horas \u2014 sin excepciones:", [
        "Desde que el cliente confirma el acuerdo, el sistema est\u00e1 funcionando en menos de dos d\u00edas h\u00e1biles.",
        "El cliente recibe una demostraci\u00f3n en vivo del proceso completo antes de activar la mensualidad.",
        "Red Code puede presentar resultados concretos a su cliente en la misma semana en que cerr\u00f3 la referencia.",
      ]),
      gap(100),
      h2("Lo que entregamos a cada cliente"),
      gap(60),
      mkTable(
        [
          { text: "Proceso automatizado" },
          { text: "Lo que cambia para el negocio del cliente", color: "A7F3D0" },
        ],
        [
          [{ text: "Seguimiento de leads"               }, { text: "Respuesta inmediata a prospectos, a cualquier hora, sin que nadie del equipo intervenga manualmente" }],
          [{ text: "Calificaci\u00f3n de prospectos"    }, { text: "El equipo de ventas solo trabaja los leads con intenci\u00f3n real de compra, no todos los que llegan" }],
          [{ text: "Atenci\u00f3n al cliente"           }, { text: "Consultas respondidas al instante, 24/7, sin personal adicional ni costo variable por consulta" }],
          [{ text: "Onboarding de clientes nuevos"      }, { text: "El proceso de bienvenida ocurre autom\u00e1ticamente en menos de 48h, sin coordinaci\u00f3n manual del equipo" }],
          [{ text: "Reportes de ventas y operaci\u00f3n" }, { text: "El gerente recibe cada semana un resumen de pipeline, conversi\u00f3n y pedidos sin ped\u00edrselo a nadie" }],
          [{ text: "Integraci\u00f3n con sistemas actuales" }, { text: "Conectamos con el CRM, WhatsApp Business, Google Sheets o cualquier plataforma que el cliente ya use" }],
        ],
        [3000, 6000]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════════════════
      // 2. EL PROBLEMA
      // ══════════════════════════════════════════════════════════════════════
      h1("2. El problema que resolvemos"),
      body("El problema m\u00e1s costoso que tienen los clientes de una agencia de marketing no es la falta de leads. Es lo que pasa despu\u00e9s. Las campa\u00f1as generan inter\u00e9s, los formularios se llenan, los mensajes llegan \u2014 y luego, nada. El equipo de ventas tiene otras prioridades, el due\u00f1o no revis\u00f3 el correo, o simplemente pasaron cuatro horas antes de que alguien respondiera. Para ese momento, el prospecto ya habl\u00f3 con la competencia."),
      gap(80),
      body("Este no es un problema de disciplina ni de actitud. Es un problema estructural: los negocios peque\u00f1os y medianos no tienen capacidad de responder en tiempo real sin automatizar ese proceso. Y cuando el cliente de una agencia no puede convertir sus leads en ventas, la agencia pierde la cuenta \u2014 no porque la campa\u00f1a fallara, sino porque el embudo se rompi\u00f3 despu\u00e9s de la campa\u00f1a."),
      gap(80),
      body("Para Red Code, esto representa un riesgo directo. Cada cliente que no puede demostrar ROI de sus campa\u00f1as es un cliente que eventualmente cuestiona el valor de su contrato de marketing. La automatizaci\u00f3n del seguimiento no es un servicio adicional que Red Code puede ofrecer \u2014 es la pieza que protege la retenci\u00f3n de sus propios clientes y convierte cada campa\u00f1a en una historia de conversi\u00f3n demostrable."),
      gap(120),
      statRow([
        { val: "78%",   label: "de los leads generados online nunca reciben seguimiento adecuado" },
        { val: "5 min", label: "es la ventana cr\u00edtica para responder antes de que la intenci\u00f3n de compra caiga un 80%" },
        { val: "3x",    label: "m\u00e1s conversiones logran los negocios que responden en los primeros 5 minutos" },
      ]),
      gap(120),
      body("El patr\u00f3n se repite en todos los sectores. No importa si el cliente es una empresa de distribuci\u00f3n, una cl\u00ednica, una inmobiliaria o una firma de servicios profesionales: el cuello de botella siempre aparece en el proceso comercial post-lead. La campa\u00f1a funciona. El lead llega. Y el proceso comercial no est\u00e1 preparado para recibirlo a tiempo."),
      gap(80),
      h2("Las consecuencias para la agencia"),
      gap(60),
      body("Cuando los clientes de Red Code no convierten sus leads, las consecuencias para la agencia son inmediatas y directas:"),
      gap(60),
      bullet("El cliente culpa a la campa\u00f1a, no a su proceso de seguimiento \u2014 y cancela el contrato de marketing"),
      bullet("Red Code no puede demostrar ROI tangible aunque la campa\u00f1a haya generado volumen real de prospectos"),
      bullet("La agencia pierde un cliente recurrente, no por mal trabajo, sino por un problema fuera de su control actual"),
      bullet("La competencia que s\u00ed ofrece automatizaci\u00f3n como parte de su propuesta gana la cuenta a futuro"),
      gap(100),
      callout("C\u00f3mo cambia esta din\u00e1mica con la alianza:", [
        "Cuando los clientes de Red Code convierten mejor, le atribuyen ese \u00e9xito a la agencia que los conect\u00f3 con la soluci\u00f3n.",
        "Red Code puede demostrar ROI completo: tr\u00e1fico generado, leads recibidos y conversi\u00f3n alcanzada.",
        "Un cliente satisfecho con sus resultados operativos renueva su contrato de marketing sin cuestionarlo.",
        "Red Code pasa de ser proveedor de tr\u00e1fico a ser socio estrat\u00e9gico del crecimiento del cliente.",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════════════════
      // 3. CÓMO FUNCIONA
      // ══════════════════════════════════════════════════════════════════════
      h1("3. C\u00f3mo funciona la alianza"),
      body("El modelo est\u00e1 dise\u00f1ado para que Red Code capture ingresos adicionales sin a\u00f1adir trabajo a su operaci\u00f3n. No hay que aprender a configurar sistemas, no hay que dar soporte t\u00e9cnico, no hay que gestionar entregas. Red Code hace lo que ya sabe hacer \u2014 identificar oportunidades y mantener relaciones con clientes \u2014 y Klimze hace el resto."),
      gap(80),
      body("El proceso comienza cuando Red Code detecta que uno de sus clientes tiene un problema operativo que se puede resolver: seguimiento de leads sin respuesta, atenci\u00f3n al cliente desbordada, reportes que se hacen manualmente, onboarding que tarda d\u00edas. En ese momento, Red Code hace la introducci\u00f3n y Klimze toma el proceso desde ah\u00ed. Red Code puede estar presente en la primera reuni\u00f3n o simplemente facilitar el contacto \u2014 lo que prefiera."),
      gap(80),
      body("La facturaci\u00f3n la emite Klimze directamente al cliente final. Red Code no maneja dinero del cliente, no emite facturas por este servicio y no asume ninguna responsabilidad contractual con el cliente final. La relaci\u00f3n comercial es entre ese cliente y Klimze. Red Code es el origen de esa relaci\u00f3n y cobra mensualmente por haberla generado."),
      gap(120),
      h2("El proceso paso a paso"),
      gap(60),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        columnWidths: [520, 2200, 6280],
        rows: [
          ...[
            ["01", "Red Code identifica la oportunidad",
              "Detecta un cliente \u2014 actual o nuevo \u2014 con un proceso operativo que se puede mejorar: seguimiento de leads, atenci\u00f3n al cliente, reportes manuales, onboarding lento. Hace la introducci\u00f3n a Klimze."],
            ["02", "Klimze realiza el diagn\u00f3stico gratuito",
              "Una reuni\u00f3n de 30 minutos con el cliente final para mapear el proceso, identificar el flujo con mayor impacto y presentar la soluci\u00f3n con precio y plazo exacto. Sin costo para nadie."],
            ["03", "Klimze entrega el sistema en 24\u201348h",
              "El cliente acepta la propuesta. Klimze configura, integra y entrega el proceso funcionando en menos de 48 horas. El cliente recibe una demostraci\u00f3n en vivo antes de activar la mensualidad."],
            ["04", "Red Code recibe su comisi\u00f3n",
              "El 20% del setup se transfiere en los primeros 5 d\u00edas h\u00e1biles tras el pago del cliente. Desde el mes siguiente, Red Code recibe el 20% mensual de forma autom\u00e1tica mientras el cliente siga activo."],
          ].map(([n, title, desc], i) => new TableRow({ children: [
            new TableCell({
              borders: noBorders,
              margins: { top: 120, bottom: 120, left: 0, right: 100 },
              width: { size: 520, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              children: [para([run(n, { bold: true, size: 26, color: C.green })], { before: 0, after: 0 })]
            }),
            new TableCell({
              borders: { top: none, bottom: i < 3 ? thin : none, left: none, right: none },
              margins: { top: 120, bottom: 160, left: 0, right: 160 },
              width: { size: 2200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              children: [para([run(title, { bold: true, size: 21, color: C.dark })], { before: 0, after: 0 })]
            }),
            new TableCell({
              borders: { top: none, bottom: i < 3 ? thin : none, left: none, right: none },
              margins: { top: 120, bottom: 160, left: 0, right: 0 },
              width: { size: 6280, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              children: [para([run(desc, { size: 21, color: C.mid })], { before: 0, after: 0 })]
            }),
          ]})),
        ],
      }),
      gap(120),
      h2("Divisi\u00f3n de responsabilidades"),
      gap(60),
      mkTable(
        [
          { text: "Responsabilidad" },
          { text: "Red Code", color: C.white },
          { text: "Klimze", color: "A7F3D0" },
        ],
        [
          [{ text: "Identificar la oportunidad en la cartera de clientes"   }, { text: "S\u00ed", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "No",  color: C.muted, align: AlignmentType.CENTER }],
          [{ text: "Hacer la introducci\u00f3n al cliente final"             }, { text: "S\u00ed", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "No",  color: C.muted, align: AlignmentType.CENTER }],
          [{ text: "Diagn\u00f3stico t\u00e9cnico y propuesta al cliente"    }, { text: "No", color: C.muted, align: AlignmentType.CENTER },              { text: "S\u00ed", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Configuraci\u00f3n, integraci\u00f3n y entrega del sistema" }, { text: "No", color: C.muted, align: AlignmentType.CENTER },            { text: "S\u00ed", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Soporte t\u00e9cnico y mantenimiento mensual"            }, { text: "No", color: C.muted, align: AlignmentType.CENTER },              { text: "S\u00ed", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Facturaci\u00f3n al cliente final"                       }, { text: "No", color: C.muted, align: AlignmentType.CENTER },              { text: "S\u00ed", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Cobro de comisi\u00f3n de setup y mensual"               }, { text: "S\u00ed", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "No",  color: C.muted, align: AlignmentType.CENTER }],
          [{ text: "Inversi\u00f3n econ\u00f3mica en el proceso"             }, { text: "No", color: C.muted, align: AlignmentType.CENTER },              { text: "S\u00ed", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Gesti\u00f3n de la relaci\u00f3n comercial con el cliente" }, { text: "Compartida", italic: true, color: C.mid, align: AlignmentType.CENTER }, { text: "Compartida", italic: true, color: C.mid, align: AlignmentType.CENTER }],
        ],
        [5400, 1800, 1800]
      ),
      gap(100),
      callout("C\u00f3mo funciona el pago de comisiones:", [
        "La comisi\u00f3n de setup (20%) se transfiere a Red Code en los primeros 5 d\u00edas h\u00e1biles tras el pago del cliente.",
        "La comisi\u00f3n mensual se liquida el primer d\u00eda h\u00e1bil de cada mes por cada cliente activo \u2014 de forma autom\u00e1tica.",
        "Si un cliente ampl\u00eda su contrato con servicios adicionales, la comisi\u00f3n aplica sobre el incremento tambi\u00e9n.",
        "No hay m\u00ednimo de clientes referidos ni cuotas obligatorias de ning\u00fan tipo.",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════════════════
      // 4. CATÁLOGO
      // ══════════════════════════════════════════════════════════════════════
      h1("4. Cat\u00e1logo de servicios y precios"),
      body("Cada servicio tiene un precio de setup \u00fanico (one-time) y una mensualidad de operaci\u00f3n. El setup cubre el diagn\u00f3stico final, la configuraci\u00f3n completa, la integraci\u00f3n con las herramientas del cliente y la entrega del sistema funcionando. La mensualidad cubre mantenimiento activo, monitoreo continuo, actualizaciones y soporte \u2014 sin l\u00edmite de uso ni costo adicional por volumen."),
      gap(80),
      body("Los precios aplican a implementaciones est\u00e1ndar con una o dos integraciones. El precio final se define en el diagn\u00f3stico gratuito seg\u00fan el volumen de operaciones, los canales conectados y el nivel de personalizaci\u00f3n que el cliente necesite. Red Code conoce el rango completo de precios antes de cualquier reuni\u00f3n con el cliente final."),
      gap(100),
      mkTable(
        [
          { text: "Servicio" },
          { text: "Setup",            color: "A7F3D0", align: AlignmentType.CENTER },
          { text: "Mensual",          color: "A7F3D0", align: AlignmentType.CENTER },
          { text: "Comisi\u00f3n Setup",  color: "A7F3D0", align: AlignmentType.CENTER },
          { text: "Comisi\u00f3n /mes",   color: "A7F3D0", align: AlignmentType.CENTER },
        ],
        [
          [{ text: "* Calificaci\u00f3n y priorizaci\u00f3n de leads", bold: true, color: C.dark }, { text: "$3,000",    bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$300/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$600",   bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$60/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "* Atenci\u00f3n al cliente 24/7",               bold: true, color: C.dark }, { text: "$4,500",    bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$500/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$900",   bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$100/mes", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "* Pipeline de ventas completo",                bold: true, color: C.dark }, { text: "$7,500",    bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$750/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$1,500", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$150/mes", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Nurturing autom\u00e1tico WhatsApp/Email"      }, { text: "$3,000",    align: AlignmentType.CENTER }, { text: "$350/mes",  align: AlignmentType.CENTER }, { text: "$600",   align: AlignmentType.CENTER }, { text: "$70/mes",  align: AlignmentType.CENTER }],
          [{ text: "Generaci\u00f3n y publicaci\u00f3n de contenido"}, { text: "$3,000",    align: AlignmentType.CENTER }, { text: "$350/mes",  align: AlignmentType.CENTER }, { text: "$600",   align: AlignmentType.CENTER }, { text: "$70/mes",  align: AlignmentType.CENTER }],
          [{ text: "Procesamiento autom\u00e1tico de documentos"   }, { text: "$5,000",    align: AlignmentType.CENTER }, { text: "$550/mes",  align: AlignmentType.CENTER }, { text: "$1,000", align: AlignmentType.CENTER }, { text: "$110/mes", align: AlignmentType.CENTER }],
          [{ text: "Onboarding autom\u00e1tico de clientes"        }, { text: "$2,200",    align: AlignmentType.CENTER }, { text: "$400/mes",  align: AlignmentType.CENTER }, { text: "$440",   align: AlignmentType.CENTER }, { text: "$80/mes",  align: AlignmentType.CENTER }],
          [{ text: "* Reporte semanal automatizado"               }, { text: "$1,000",    align: AlignmentType.CENTER }, { text: "$180/mes",  align: AlignmentType.CENTER }, { text: "$200",   align: AlignmentType.CENTER }, { text: "$36/mes",  align: AlignmentType.CENTER }],
          [{ text: "Automatizaci\u00f3n personalizada", italic: true }, { text: "Desde $2,000", align: AlignmentType.CENTER }, { text: "A definir", color: C.muted, align: AlignmentType.CENTER }, { text: "Desde $400", align: AlignmentType.CENTER }, { text: "Seg\u00fan acuerdo", color: C.muted, align: AlignmentType.CENTER }],
        ],
        [3000, 1500, 1500, 1500, 1500]
      ),
      gap(80),
      body("* Servicios marcados: mayor ROI demostrado, ciclo de venta corto y alta retenci\u00f3n mensual. Puntos de entrada ideales para un primer cliente.", { color: C.muted, italic: true }),
      gap(100),
      callout("Qu\u00e9 cubre el Setup vs. la Mensualidad:", [
        "SETUP (pago \u00fanico): diagn\u00f3stico final, configuraci\u00f3n completa, integraciones con los sistemas del cliente, pruebas de funcionamiento y entrega. El cliente recibe un proceso que trabaja \u2014 no un acceso a plataforma.",
        "MENSUALIDAD (recurrente): monitoreo activo, ajustes por cambios en el negocio, soporte ante incidencias y actualizaciones sin costo adicional. El cliente nunca gestiona el sistema \u2014 Klimze lo mantiene operativo.",
      ]),
      gap(100),
      callout("Servicios de entrada recomendados para el primer cliente:", [
        "Reporte semanal automatizado ($1,000 setup): el cliente ve resultados en 24h. Cierre r\u00e1pido, ROI inmediato, abre la relaci\u00f3n.",
        "Calificaci\u00f3n de leads ($3,000 setup): impacto visible desde la primera semana. Ideal para clientes con campa\u00f1as activas.",
        "Onboarding autom\u00e1tico ($2,200 setup): elimina un problema que todos los negocios con clientes nuevos tienen.",
        "Estos tres servicios cierran r\u00e1pido, demuestran valor en d\u00edas y abren la conversaci\u00f3n para servicios de mayor volumen.",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════════════════
      // 5. LO QUE GANA RED CODE
      // ══════════════════════════════════════════════════════════════════════
      h1("5. Lo que gana Red Code"),
      body("Red Code recibe el 20% del valor de setup de cada automatizaci\u00f3n cerrada: un pago \u00fanico al momento en que el cliente confirma. Pero la parte m\u00e1s valiosa del modelo no es el setup \u2014 es la mensualidad."),
      gap(80),
      body("Mientras el cliente siga activo pagando la mensualidad, Red Code recibe el 20% de ese cobro todos los meses, de forma autom\u00e1tica, sin hacer ning\u00fan trabajo adicional. Eso significa que cada cliente cerrado se convierte en un flujo de ingresos pasivos que se acumula con el tiempo. Con 5 clientes activos, Red Code recibe 5 pagos recurrentes simult\u00e1neos. Con 10, recibe 10."),
      gap(80),
      body("El efecto compuesto es el punto m\u00e1s importante de este modelo. En el mes en que Red Code cierra 3 referencias medianas, el ingreso inmediato es tangible. Pero a los 6 meses, esos mismos 3 clientes siguen generando comisi\u00f3n \u2014 y a ellos se suman los que entraron despu\u00e9s. No hay techo de ingresos ni l\u00edmite de clientes referidos."),
      gap(120),
      h2("Comisiones por servicio"),
      gap(60),
      mkTable(
        [
          { text: "Servicio" },
          { text: "Setup",               color: C.white,   align: AlignmentType.CENTER },
          { text: "Comisi\u00f3n Setup",  color: "A7F3D0",  align: AlignmentType.CENTER },
          { text: "Mensual",             color: C.white,   align: AlignmentType.CENTER },
          { text: "Comisi\u00f3n /mes",   color: "A7F3D0",  align: AlignmentType.CENTER },
        ],
        [
          [{ text: "Pipeline de ventas completo"    }, { text: "$7,500", align: AlignmentType.CENTER }, { text: "$1,500", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$750", align: AlignmentType.CENTER }, { text: "$150/mes", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Atenci\u00f3n al cliente 24/7"   }, { text: "$4,500", align: AlignmentType.CENTER }, { text: "$900",  bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$500", align: AlignmentType.CENTER }, { text: "$100/mes", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Calificaci\u00f3n de leads"      }, { text: "$3,000", align: AlignmentType.CENTER }, { text: "$600",  bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$300", align: AlignmentType.CENTER }, { text: "$60/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Nurturing WhatsApp/Email"       }, { text: "$3,000", align: AlignmentType.CENTER }, { text: "$600",  bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$350", align: AlignmentType.CENTER }, { text: "$70/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Onboarding autom\u00e1tico"      }, { text: "$2,200", align: AlignmentType.CENTER }, { text: "$440",  bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$400", align: AlignmentType.CENTER }, { text: "$80/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Reporte semanal automatizado"   }, { text: "$1,000", align: AlignmentType.CENTER }, { text: "$200",  bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$180", align: AlignmentType.CENTER }, { text: "$36/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }],
        ],
        [2700, 1300, 1500, 1300, 2200]
      ),
      gap(120),
      h2("Escenario: 3 clientes cerrados en un mes"),
      gap(60),
      mkTable(
        [
          { text: "Cliente" },
          { text: "Servicio contratado",          color: C.white },
          { text: "Setup",   color: C.white,      align: AlignmentType.CENTER },
          { text: "Comisi\u00f3n Setup", color: "A7F3D0", align: AlignmentType.CENTER },
          { text: "Mensual", color: C.white,      align: AlignmentType.CENTER },
          { text: "Comisi\u00f3n /mes",  color: "A7F3D0", align: AlignmentType.CENTER },
        ],
        [
          [{ text: "A \u2014 Empresa de distribuci\u00f3n" }, { text: "Calificaci\u00f3n de leads + Reporte semanal" }, { text: "$4,000",  align: AlignmentType.CENTER }, { text: "$800",   bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$480",   align: AlignmentType.CENTER }, { text: "$96/mes",  bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "B \u2014 Empresa de servicios"       }, { text: "Pipeline de ventas completo"             }, { text: "$7,500",  align: AlignmentType.CENTER }, { text: "$1,500", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$750",   align: AlignmentType.CENTER }, { text: "$150/mes", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "C \u2014 Alto volumen de atenci\u00f3n"}, { text: "Atenci\u00f3n 24/7 + Onboarding autom\u00e1tico" }, { text: "$6,700",  align: AlignmentType.CENTER }, { text: "$1,340", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$900",   align: AlignmentType.CENTER }, { text: "$180/mes", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "TOTAL", bold: true, color: C.dark }, { text: "3 clientes activos", color: C.dark }, { text: "$18,200", bold: true, color: C.dark, align: AlignmentType.CENTER }, { text: "$3,640", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$2,130", bold: true, color: C.dark, align: AlignmentType.CENTER }, { text: "$426/mes", bold: true, color: C.green, align: AlignmentType.CENTER }],
        ],
        [2000, 2500, 1000, 1300, 900, 1300]
      ),
      gap(100),
      callout("Lo que significan estos n\u00fameros a largo plazo:", [
        "Mes 1: $3,640 en comisiones de setup + $426 en recurrente = $4,066 total.",
        "A los 12 meses, solo esos 3 clientes han generado: $3,640 de setup + $4,686 en mensualidades = $8,326.",
        "Cada nueva ronda de cierres se suma \u2014 el ingreso recurrente acumulado crece cada mes sin trabajo adicional.",
      ]),
      gap(120),
      h2("Proyecci\u00f3n a 12 meses (ritmo conservador: 2\u20133 clientes por mes)"),
      gap(60),
      mkTable(
        [
          { text: "Per\u00edodo" },
          { text: "Clientes activos",        color: C.white, align: AlignmentType.CENTER },
          { text: "Comisi\u00f3n setup est.", color: "A7F3D0", align: AlignmentType.CENTER },
          { text: "Recurrente acum./mes",    color: "A7F3D0", align: AlignmentType.CENTER },
          { text: "Total ese mes",           color: "A7F3D0", align: AlignmentType.CENTER },
        ],
        [
          [{ text: "Mes 1"  }, { text: "3",  align: AlignmentType.CENTER }, { text: "$3,640", align: AlignmentType.CENTER }, { text: "$426",   align: AlignmentType.CENTER }, { text: "$4,066", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Mes 3"  }, { text: "7",  align: AlignmentType.CENTER }, { text: "$2,500", align: AlignmentType.CENTER }, { text: "$994",   align: AlignmentType.CENTER }, { text: "$3,494", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Mes 6"  }, { text: "15", align: AlignmentType.CENTER }, { text: "$2,250", align: AlignmentType.CENTER }, { text: "$2,130", align: AlignmentType.CENTER }, { text: "$4,380", bold: true, color: C.green, align: AlignmentType.CENTER }],
          [{ text: "Mes 12" }, { text: "28", align: AlignmentType.CENTER }, { text: "$2,000", align: AlignmentType.CENTER }, { text: "$3,976", bold: true, color: C.green, align: AlignmentType.CENTER }, { text: "$5,976", bold: true, color: C.green, align: AlignmentType.CENTER }],
        ],
        [1800, 1800, 2000, 2000, 1400]
      ),
      gap(80),
      body("A partir del mes 6, el ingreso recurrente supera al ingreso de nuevos cierres. Red Code tiene un activo de ingresos pasivos que crece solo, sin gesti\u00f3n adicional.", { italic: true, color: C.muted }),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════════════════
      // 6. CASOS DE USO
      // ══════════════════════════════════════════════════════════════════════
      h1("6. Casos de uso para los clientes de Red Code"),
      body("No hace falta buscar clientes nuevos para comenzar. Los tres perfiles que describimos a continuaci\u00f3n representan tipos de negocios que la mayor\u00eda de agencias como Red Code ya atiende. El problema que cada uno tiene es real, com\u00fan y costoso \u2014 y la soluci\u00f3n est\u00e1 en el cat\u00e1logo."),
      gap(120),

      h3("Caso A \u2014 Empresa de distribuci\u00f3n o retail con fuerza de ventas"),
      body("Una empresa con equipo de ventas activo que recibe leads por publicidad digital, WhatsApp y formularios web. Los vendedores priorizan clientes existentes sobre prospectos nuevos. Los leads que llegan fuera de horario no reciben respuesta hasta el d\u00eda siguiente \u2014 o nunca. El due\u00f1o no tiene visibilidad de en qu\u00e9 etapa est\u00e1 cada oportunidad ni qui\u00e9n est\u00e1 siguiendo qu\u00e9 cuenta."),
      gap(60),
      bullet("Calificaci\u00f3n de leads: cada prospecto nuevo recibe respuesta inmediata y queda clasificado por urgencia antes de que el equipo lo toque"),
      bullet("Pipeline de ventas: el equipo trabaja solo leads calificados \u2014 no pierde tiempo en contactos sin intenci\u00f3n real de compra"),
      bullet("Reporte semanal: el gerente recibe cada lunes el estado completo del pipeline sin ped\u00edrselo a nadie"),
      gap(80),
      callout("Resultado estimado en 60 d\u00edas", [
        "Tiempo de primera respuesta a un lead: de horas a minutos.",
        "El equipo de ventas enfoca su tiempo en cerrar, no en clasificar ni perseguir prospectos.",
        "El gerente tiene visibilidad completa del pipeline sin depender de reportes manuales.",
        "Comisi\u00f3n estimada para Red Code: $800 setup + $96/mes recurrente.",
      ]),
      gap(120),

      h3("Caso B \u2014 Empresa de servicios con propuestas y proceso de onboarding"),
      body("Una firma de servicios profesionales, agencia, empresa de consultor\u00eda o proveedor B2B que tiene un proceso de propuesta\u2013aceptaci\u00f3n\u2013onboarding que hoy se hace a mano. Cada cliente nuevo requiere correos de bienvenida, recolecci\u00f3n de informaci\u00f3n, documentos y accesos \u2014 todo coordinado por alguien del equipo. Cuando varios clientes entran al mismo tiempo, el proceso se rompe y los nuevos sienten que no pasa nada despu\u00e9s de firmar."),
      gap(60),
      bullet("Onboarding autom\u00e1tico: el cliente nuevo recibe bienvenida, instrucciones, documentos y accesos autom\u00e1ticamente en menos de 48 horas"),
      bullet("Procesamiento de documentos: formularios, contratos y datos enviados por el cliente se procesan y registran solos"),
      bullet("Nurturing autom\u00e1tico: los prospectos que no cerraron todav\u00eda reciben seguimiento estructurado por WhatsApp durante semanas sin esfuerzo del equipo"),
      gap(80),
      callout("Resultado estimado en 60 d\u00edas", [
        "El proceso de onboarding de un cliente nuevo: de 5\u201315 d\u00edas a menos de 48 horas.",
        "El equipo deja de ser el cuello de botella en los primeros d\u00edas de cada relaci\u00f3n nueva.",
        "Los prospectos en seguimiento convierten 2\u20133 veces m\u00e1s que con seguimiento manual.",
        "Comisi\u00f3n estimada para Red Code: $1,040 setup + $150/mes recurrente.",
      ]),
      gap(120),

      h3("Caso C \u2014 Negocio con alto volumen de consultas de clientes"),
      body("Un negocio con presencia activa en WhatsApp Business o redes sociales que recibe entre 50 y 300 mensajes al d\u00eda de clientes o prospectos. Puede ser una cl\u00ednica, una empresa de servicios al consumidor, un negocio educativo, o cualquier empresa donde la consulta es el primer paso de la venta. La persona que responde mensajes no tiene tiempo para cerrar ventas porque est\u00e1 ocupada respondiendo siempre las mismas cinco preguntas. Fuera de horario, nadie responde \u2014 y los prospectos que escriben a las 10 PM compran en otro lugar al d\u00eda siguiente."),
      gap(60),
      bullet("Atenci\u00f3n 24/7: respuesta inmediata a consultas entrantes a cualquier hora, sin personal adicional ni costo por consulta"),
      bullet("Resoluci\u00f3n inteligente: el sistema detecta cu\u00e1ndo una consulta necesita un humano y escala con el contexto completo al agente correcto"),
      bullet("Calificaci\u00f3n de leads: los prospectos con intenci\u00f3n real de compra se priorizan autom\u00e1ticamente para el equipo de ventas"),
      gap(80),
      callout("Resultado estimado en 30 d\u00edas", [
        "60\u201380% de consultas resueltas sin que ning\u00fan miembro del equipo intervenga.",
        "Tiempo de respuesta: de minutos u horas a segundos, a cualquier hora del d\u00eda.",
        "El equipo de atenci\u00f3n se libera para casos que requieren criterio humano.",
        "Comisi\u00f3n estimada para Red Code: $900 setup + $100/mes recurrente.",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════════════════
      // 7. POR QUÉ KLIMZE
      // ══════════════════════════════════════════════════════════════════════
      h1("7. Por qu\u00e9 Klimze"),
      body("Cualquier proveedor puede decir que tiene buenas soluciones. Lo que hace que esta alianza sea pr\u00e1ctica para Red Code no es solo la calidad del trabajo \u2014 es la forma en que est\u00e1 estructurada para que el riesgo sea cero y la operaci\u00f3n sea simple. Estas son las cinco razones concretas por las que esto tiene sentido:"),
      gap(100),

      h3("1. Entrega en 24\u201348 horas \u2014 sin excepciones"),
      body("En Klimze hacemos entregas funcionales en 24 a 48 horas desde que el cliente nos da la informaci\u00f3n que necesitamos. Este no es un objetivo aspiracional \u2014 es nuestro est\u00e1ndar operativo. Para Red Code, esto significa que cuando presentas un cliente, el resultado es r\u00e1pido y visible. No hay semanas de espera donde el cliente empieza a dudar. El cliente ve resultados antes de que pase una semana \u2014 y eso genera confianza en la agencia que hizo la introducci\u00f3n."),
      gap(100),

      h3("2. Conectamos con cualquier herramienta que el cliente ya usa"),
      body("Los clientes no tienen que cambiar sus sistemas actuales para trabajar con nosotros. En Klimze hacemos que los procesos se conecten con lo que el cliente ya tiene: su CRM, su WhatsApp Business, su correo, su hoja de c\u00e1lculo, su sistema de facturaci\u00f3n. No imponemos plataformas nuevas ni pedimos migraciones costosas. Esto elimina la fricci\u00f3n de adopci\u00f3n que mata otros proyectos tecnol\u00f3gicos y hace que el cliente vea valor desde el primer d\u00eda."),
      gap(100),

      h3("3. Infraestructura 100% nuestra \u2014 Red Code nunca toca el backend"),
      body("Red Code no recibe acceso a sistemas. No gestiona configuraciones. No recibe tickets de soporte del cliente final sobre el funcionamiento del proceso. Toda la relaci\u00f3n t\u00e9cnica y operativa con el cliente es de Klimze. Red Code presenta la oportunidad y cobra la comisi\u00f3n \u2014 el resto no es su problema. Y eso no es solo conveniente: es una protecci\u00f3n real. Red Code no puede cometer errores en algo que nunca opera ni maneja."),
      gap(100),

      h3("4. Cero costo, cero riesgo, cero responsabilidad para Red Code"),
      body("No hay cuota de entrada. No hay m\u00ednimo de clientes referidos. No hay contrato de exclusividad. No hay inversi\u00f3n inicial de ning\u00fan tipo. Red Code comienza a participar cuando quiera, con el cliente que quiera, y puede pausar en cualquier momento sin consecuencia. Si un cliente decide no contratar despu\u00e9s del diagn\u00f3stico, no pasa nada ni para Red Code ni para el cliente. No hubo costo para ninguno de los dos."),
      gap(100),

      h3("5. Soporte activo \u2014 el cliente siempre tiene a alguien"),
      body("El servicio mensual cubre mantenimiento real: en Klimze hacemos monitoreo de que los procesos est\u00e9n funcionando, ajustes cuando cambia algo en el negocio del cliente y resoluci\u00f3n r\u00e1pida cuando hay una incidencia. El cliente no queda solo despu\u00e9s de la entrega. Eso es lo que genera retenci\u00f3n alta \u2014 y la retenci\u00f3n es lo que hace que la comisi\u00f3n mensual de Red Code siga creciendo sin hacer nada adicional."),
      gap(100),
      callout("En resumen:", [
        "Red Code no necesita entender c\u00f3mo funciona lo que Klimze hace.",
        "Solo necesita saber que funciona \u2014 y que cada cliente activo que introdujo sigue pagando comisi\u00f3n el mes que viene.",
        "El \u00fanico escenario en que Red Code no gana nada es que no haya ning\u00fan cliente cerrado. Y en ese caso, tampoco pierde nada.",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════════════════
      // 8. PRÓXIMOS PASOS
      // ══════════════════════════════════════════════════════════════════════
      h1("8. Pr\u00f3ximos pasos"),
      body("Si esto tiene sentido para Red Code, el siguiente paso es simple. No hay proceso de aprobaci\u00f3n largo ni negociaci\u00f3n contractual extensa. La alianza se activa con una conversaci\u00f3n y un acuerdo directo. Estos son los cuatro pasos para comenzar esta semana:"),
      gap(80),
      body("El piloto es clave: sirve para que Red Code vea el proceso completo en acci\u00f3n \u2014 desde el diagn\u00f3stico hasta la entrega \u2014 y pueda evaluar el modelo con un caso real antes de comprometerse a cualquier acuerdo formal. No hay forma m\u00e1s clara de entender c\u00f3mo funciona esto que verlo funcionar."),
      gap(120),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        columnWidths: [520, 2200, 6280],
        rows: [
          ...[
            ["01", "Reuni\u00f3n de alineaci\u00f3n (esta semana)",
              "Una llamada de 30 minutos para revisar juntos el cat\u00e1logo, definir los servicios prioritarios para el perfil de clientes de Red Code, y aclarar cualquier pregunta sobre comisiones, tiempos y proceso. Sin presentaci\u00f3n de ventas \u2014 es una conversaci\u00f3n operativa."],
            ["02", "Firma del acuerdo de alianza",
              "Un documento de una p\u00e1gina que establece el modelo de comisiones, el proceso de referido y las responsabilidades de cada parte. Sin exclusividades, sin m\u00ednimos, sin penalidades. Un acuerdo dise\u00f1ado para que Red Code se sienta c\u00f3modo, no para atarlo a nada."],
            ["03", "Identificar el primer cliente piloto",
              "Red Code revisa su cartera actual e identifica un cliente con alguno de los tres perfiles descritos en este documento. No hace falta que sea el cliente perfecto \u2014 solo que tenga el problema. Klimze hace el diagn\u00f3stico y construye la propuesta sin costo."],
            ["04", "Primera entrega \u2014 primer ingreso",
              "Klimze entrega el primer proyecto en 24\u201348 horas. Red Code recibe su primera comisi\u00f3n de setup en los primeros 5 d\u00edas h\u00e1biles. El cliente ve el sistema funcionando. El ingreso recurrente comienza desde el mes siguiente."],
          ].map(([n, title, desc], i) => new TableRow({ children: [
            new TableCell({
              borders: noBorders,
              margins: { top: 120, bottom: 120, left: 0, right: 100 },
              width: { size: 520, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              children: [para([run(n, { bold: true, size: 26, color: C.green })], { before: 0, after: 0 })]
            }),
            new TableCell({
              borders: { top: none, bottom: i < 3 ? thin : none, left: none, right: none },
              margins: { top: 120, bottom: 160, left: 0, right: 160 },
              width: { size: 2200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              children: [para([run(title, { bold: true, size: 21, color: C.dark })], { before: 0, after: 0 })]
            }),
            new TableCell({
              borders: { top: none, bottom: i < 3 ? thin : none, left: none, right: none },
              margins: { top: 120, bottom: 160, left: 0, right: 0 },
              width: { size: 6280, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              children: [para([run(desc, { size: 21, color: C.mid })], { before: 0, after: 0 })]
            }),
          ]})),
        ],
      }),
      gap(100),
      callout("Lo que Red Code no arriesga en ning\u00fan momento:", [
        "Ning\u00fan peso de inversi\u00f3n inicial, en ninguna etapa del proceso.",
        "Ninguna responsabilidad operativa ni t\u00e9cnica con el cliente final.",
        "Ninguna exclusividad ni contrato de largo plazo obligatorio.",
        "Si el cliente piloto no prospera, la alianza no genera ning\u00fan costo ni compromiso para Red Code.",
        "El \u00fanico escenario en que Red Code no gana nada es que no haya ning\u00fan cliente cerrado \u2014 y en ese caso, tampoco pierde nada.",
      ]),
      gap(120),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        columnWidths: [9000],
        rows: [new TableRow({ children: [new TableCell({
          borders: { top: accent, bottom: accent, left: accent, right: accent },
          shading: { fill: C.greenLight, type: ShadingType.CLEAR },
          margins: { top: 280, bottom: 280, left: 400, right: 400 },
          children: [
            para([run("La automatizaci\u00f3n que tus clientes necesitan ya existe.", { bold: true, size: 26, color: C.dark })], { align: AlignmentType.CENTER, after: 80 }),
            para([run("Ya est\u00e1 lista. Ya tiene precio. Lo \u00fanico que falta es que uno de tus clientes la use \u2014 y que t\u00fa cobres por haberlo conectado.", { size: 22, color: C.mid })], { align: AlignmentType.CENTER, after: 120 }),
            para([run("Siguiente paso: agenda la reuni\u00f3n de alineaci\u00f3n. 30 minutos. Esta semana.", { bold: true, size: 22, color: C.dark })], { align: AlignmentType.CENTER, after: 120 }),
            para([run("Carlos \u2014 Klimze   |   klimze.app", { bold: true, size: 22, color: C.green })], { align: AlignmentType.CENTER }),
          ]
        })]})],
      }),

    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('public/red-code-proposal-v7.docx', buf);
  console.log('Done: public/red-code-proposal-v7.docx');
});
