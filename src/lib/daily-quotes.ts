
const quotes = [
    "Cách tốt nhất để dự đoán tương lai là tạo ra nó.",
    "Thành công không phải là cuối cùng, thất bại không phải là chết người: lòng can đảm để tiếp tục mới là điều quan trọng.",
    "Hãy tin rằng bạn có thể và bạn đã đi được nửa đường.",
    "Hành trình ngàn dặm bắt đầu bằng một bước chân.",
    "Chỉ có một cách để làm những công việc tuyệt vời là yêu những gì bạn làm.",
    "Đừng xem đồng hồ; hãy làm những gì nó làm. Tiếp tục đi.",
    "Chất lượng không phải là một hành động, nó là một thói quen.",
    "Tương lai thuộc về những người tin vào vẻ đẹp của những giấc mơ của họ.",
    "Khó khăn thường chuẩn bị cho những người bình thường một định mệnh phi thường.",
    "Thành công là tổng hợp của những nỗ lực nhỏ, lặp đi lặp lại ngày qua ngày.",
    "Bạn càng làm việc chăm chỉ, bạn càng may mắn.",
    "Kỷ luật là cầu nối giữa mục tiêu và thành tựu.",
    "Đừng đặt ra giới hạn cho thử thách của bạn. Hãy thử thách giới hạn của bạn.",
    "Sự khác biệt giữa bình thường và phi thường là một chút nỗ lực 'thêm'.",
    "Nếu cơ hội không gõ cửa, hãy xây một cánh cửa.",
];

const getDayOfYear = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};

export const getDailyQuote = (): string => {
    const dayIndex = getDayOfYear(new Date());
    const quoteIndex = dayIndex % quotes.length;
    return quotes[quoteIndex];
};
