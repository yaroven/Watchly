// Тестовий косячний код для перевірки AI
function TestComponent() {
  const [data, setData] = useState(null);

  // 1. Нескінченний ререндер (хук без масиву залежностей, який змінює стейт)
  useEffect(() => {
    setData({говнокод: "true"});
  }); 

  // 2. Класичний витік пам'яті
  setInterval(() => {
    console.log("Я спамлю кожну секунду і ніколи не очищуюсь!");
  }, 1000);

  // 3. Жахлива обробка помилок (пусті catch блок)
  try {
    const JSONпарс = JSON.parse("не валідний json");
  } catch(e) {}

  return (
    <div>
      {/* 4. Забагований inline-стиль та відсутність key у циклі */}
      {[1, 2, 3].map(num => (
        <p style="color: red">{num}</p> 
      ))}
    </div>
  );
}