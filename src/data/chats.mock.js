export const CHATS_MOCK = [
  {
    id: 'c1', name: 'Camila Álvarez', time: 'ahora', unread: 1, online: true,
    lastMsg: 'Confirmo el turno de mañana, gracias',
    tag: 'AUTO',
    messages: [
      { id: 'm1', from: 'bot',  text: 'Hola Camila! Te recordamos tu turno mañana a las 09:00.', time: '10:12' },
      { id: 'm2', from: 'user', text: 'Confirmo el turno de mañana, gracias', time: '10:14' },
    ],
  },
  {
    id: 'c2', name: 'Martín Pérez', time: '12m', unread: 0, online: false,
    lastMsg: '¿Tienen turno esta semana para limpieza?',
    tag: null,
    messages: [
      { id: 'm1', from: 'user', text: '¿Tienen turno esta semana para limpieza?', time: '09:48' },
      { id: 'm2', from: 'bot',  text: 'Claro Martín, tenemos disponibilidad el jueves a las 10:00 o 14:30. ¿Cuál preferís?', time: '09:49' },
    ],
  },
  {
    id: 'c3', name: 'Lucía Fernández', time: '34m', unread: 0, online: false,
    lastMsg: '¿Cuánto sale la primera consulta?',
    tag: 'BOT',
    messages: [
      { id: 'm1', from: 'user', text: '¿Cuánto sale la primera consulta?', time: '09:26' },
      { id: 'm2', from: 'bot',  text: 'La primera consulta tiene un costo de $800 pesos uruguayos e incluye evaluación completa.', time: '09:27' },
    ],
  },
  {
    id: 'c4', name: 'Roberto Castro', time: '1h', unread: 0, online: false,
    lastMsg: 'Perfecto, nos vemos el jueves',
    tag: null,
    messages: [
      { id: 'm1', from: 'bot',  text: 'Roberto, tu turno del jueves 30 a las 10:00 está confirmado.', time: '09:00' },
      { id: 'm2', from: 'user', text: 'Perfecto, nos vemos el jueves', time: '09:02' },
    ],
  },
  {
    id: 'c5', name: 'Ana Rodríguez', time: '2h', unread: 2, online: true,
    lastMsg: '¿Puedo cambiar el horario?',
    tag: null,
    messages: [
      { id: 'm1', from: 'user', text: '¿Puedo cambiar el horario de mi turno de hoy?', time: '08:30' },
      { id: 'm2', from: 'user', text: '¿Puedo cambiar el horario?', time: '08:31' },
    ],
  },
];
