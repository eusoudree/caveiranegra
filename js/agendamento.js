$(function () {
  const SUPABASE_URL = "https://grjfroowshvlabxbkfei.supabase.co";
  const SUPABASE_KEY = "sb_publishable_nheZ6Sen2WuoW66GSou5rw_KjffhpjT";

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const CONFIG = {
    amount: 250,
    paymentUrl: "https://mpago.la/2CvfSYS",

    // 0 domingo, 1 segunda ... 6 sábado.
    // ALTERE AQUI OS HORÁRIOS DA SUA AGENDA.
    schedule: {
      0: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
      1: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
      2: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
      3: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
      4: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
      5: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"],
      6: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"]
    }
  };

  let month = new Date();
  month.setDate(1);

  let selectedDate = null;
  let selectedTime = null;
  let bookedSlots = [];

  function pad(n){ return String(n).padStart(2, "0"); }

  function dateKey(d){
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function sameDay(a,b){
    return a && b &&
      a.getFullYear()===b.getFullYear() &&
      a.getMonth()===b.getMonth() &&
      a.getDate()===b.getDate();
  }

  function dateLabel(d){
    return d.toLocaleDateString("pt-BR", {
      weekday:"long", day:"2-digit", month:"long"
    }).replace(/^./, x=>x.toUpperCase());
  }

  function monthLabel(d){
    return d.toLocaleDateString("pt-BR", {
      month:"long", year:"numeric"
    }).replace(/^./, x=>x.toUpperCase());
  }

  function todayZero(){
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }

  async function loadBookedSlots() {
    bookedSlots = [];

    if (!selectedDate) return;

    const { data, error } = await db.rpc("get_booked_slots", {
      p_date: dateKey(selectedDate)
    });

    if (error) {
      console.error(error);
      $(".step1-error").text("Não foi possível consultar a disponibilidade.");
      return;
    }

    bookedSlots = data || [];
  }

  function isBooked(time) {
    return bookedSlots.some(slot => String(slot.start_time).substring(0,5) === time);
  }

  async function renderTimes() {
    if (!selectedDate) {
      $(".times").addClass("d-none");
      return;
    }

    await loadBookedSlots();

    $(".times").removeClass("d-none");
    $(".selected-date").text(dateLabel(selectedDate));

    const times = CONFIG.schedule[selectedDate.getDay()] || [];
    const $list = $(".time-list").empty();

    times.forEach(time => {
      const booked = isBooked(time);
      const $b = $("<button>", {
        type:"button",
        class:"time",
        text: booked ? "INDISP." : time
      });

      if (booked) {
        $b.prop("disabled", true).addClass("disabled");
      } else {
        if (time === selectedTime) $b.addClass("selected");

        $b.on("click", function(){
          selectedTime = time;
          $(".time").removeClass("selected");
          $(this).addClass("selected");
          $(".next-step").prop("disabled", false);
          $(".step1-error").text("");
        });
      }

      $list.append($b);
    });

    if (!times.length) {
      $list.append($("<div>", {
        text:"Nenhum horário disponível neste dia.",
        css:{color:"#81786d",fontSize:"9px",gridColumn:"1/-1",padding:"8px 0"}
      }));
    }
  }

  function renderCalendar() {
    $(".month-title").text(monthLabel(month));

    const $days = $(".days").empty();
    const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const total = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
    const today = todayZero();

    for(let i=0;i<first;i++){
      $days.append($("<button>", {
        type:"button",
        class:"day empty",
        disabled:true
      }));
    }

    for(let n=1;n<=total;n++){
      const d = new Date(month.getFullYear(), month.getMonth(), n);
      d.setHours(0,0,0,0);

      const hasSchedule = (CONFIG.schedule[d.getDay()] || []).length > 0;
      const disabled = d < today || !hasSchedule;

      const $day = $("<button>", {
        type:"button",
        class:"day",
        text:n
      });

      if(disabled) $day.addClass("disabled");
      if(sameDay(d,today)) $day.addClass("today");
      if(sameDay(d,selectedDate)) $day.addClass("selected");

      if(!disabled){
        $day.on("click", async function(){
          selectedDate = d;
          selectedTime = null;
          $(".next-step").prop("disabled", true);
          $(".day").removeClass("selected");
          $(this).addClass("selected");
          await renderTimes();
        });
      }

      $days.append($day);
    }
  }

  function setStep(n){
    $(".step-pane").removeClass("active");
    $(`.step-pane[data-step="${n}"]`).addClass("active");

    $("[data-step-dot]").each(function(){
      $(this).toggleClass("active", Number($(this).data("step-dot")) <= n);
    });

    if(n === 2){
      $(".chosen-datetime").text(`${dateLabel(selectedDate)} · ${selectedTime}`);
    }
  }

  async function openBooking(){
    month = new Date();
    month.setDate(1);
    selectedDate = null;
    selectedTime = null;

    $(".next-step").prop("disabled", true);
    $(".times").addClass("d-none");
    $(".step1-error,.form-error").text("");

    renderCalendar();
    setStep(1);

    $("#booking").addClass("open");
    $("body").addClass("booking-open");
  }

  function closeBooking(){
    $("#booking").removeClass("open");
    $("body").removeClass("booking-open");
  }

  $(".open-booking").on("click", openBooking);
  $(".booking-close,.booking-backdrop,.back-home").on("click", closeBooking);

  $(document).on("keydown", function(e){
    if(e.key === "Escape" && $("#booking").hasClass("open")) closeBooking();
  });

  $(".month-prev").on("click", function(){
    month.setMonth(month.getMonth()-1);
    selectedDate=null;
    selectedTime=null;
    $(".times").addClass("d-none");
    $(".next-step").prop("disabled",true);
    renderCalendar();
  });

  $(".month-next").on("click", function(){
    month.setMonth(month.getMonth()+1);
    selectedDate=null;
    selectedTime=null;
    $(".times").addClass("d-none");
    $(".next-step").prop("disabled",true);
    renderCalendar();
  });

  $(".next-step").on("click", function(){
    if(!selectedDate || !selectedTime){
      $(".step1-error").text("Escolha uma data e um horário.");
      return;
    }
    $(".chosen-datetime").text(`${dateLabel(selectedDate)} · ${selectedTime}`);
    setStep(2);
  });

  $(".back-step").on("click", function(){
    setStep(1);
  });

  $("#booking-form").on("submit", async function(e){
    e.preventDefault();

    const name = $.trim($("#name").val());
    const whatsapp = $.trim($("#whatsapp").val());
    const email = $.trim($("#email").val());
    const $error = $(".form-error");

    if(!name || !whatsapp || !email){
      $error.text("Preencha nome, WhatsApp e e-mail.");
      return;
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      $error.text("Digite um e-mail válido.");
      return;
    }

    const $submit = $(this).find("button[type=submit]");
    $submit.prop("disabled", true).text("RESERVANDO...");

    // A tabela original não possui whatsapp.
    // O número é enviado temporariamente apenas no frontend nesta versão.
    // Para salvar WhatsApp, rode o ALTER TABLE indicado abaixo.
    const end = new Date(`2000-01-01T${selectedTime}:00`);
    end.setMinutes(end.getMinutes() + 60);
    const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}:00`;

    const { data, error } = await db.rpc("create_booking", {
      p_client_name: name,
      p_client_email: email,
      p_booking_date: dateKey(selectedDate),
      p_start_time: `${selectedTime}:00`,
      p_end_time: endTime,
      p_amount: CONFIG.amount
    });

    if(error){
      console.error(error);
      $submit.prop("disabled", false).text("CONFIRMAR AGENDAMENTO");

      if(String(error.message).includes("HORARIO_INDISPONIVEL")){
        $error.text("Esse horário acabou de ser reservado. Escolha outro.");
        setStep(1);
        selectedTime = null;
        await renderTimes();
      }else{
        $error.text("Não foi possível concluir o agendamento. Tente novamente.");
      }
      return;
    }

    $(".chosen-name").text(name);
    $(".chosen-datetime").text(`${dateLabel(selectedDate)} · ${selectedTime}`);
    $(".payment-link").attr("href", CONFIG.paymentUrl);

    setStep(3);
    $submit.prop("disabled", false).text("CONFIRMAR AGENDAMENTO");
  });

  // Header
  $(window).on("scroll", function(){
    $(".site-header").toggleClass("scrolled", window.scrollY > 30);
  });

  // Fecha menu mobile ao navegar.
  $(".nav-link").on("click", function(){
    const el = document.getElementById("menu");
    if(window.innerWidth < 992 && el.classList.contains("show")){
      bootstrap.Collapse.getOrCreateInstance(el).hide();
    }
  });
});
