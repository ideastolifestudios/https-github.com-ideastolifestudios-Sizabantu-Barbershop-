export const handleDownloadPDF = async (booking: any) => {
  if (!booking) return;
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6'
    });

    // Headers and metadata
    doc.setTextColor(24, 28, 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SIZABANTU BARBERSHOP', 10, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('ESTABLISHED IN 2022', 10, 20);
    doc.text('PREMIUM GROOMING EXPERIENCE', 10, 24);

    // Divider line
    doc.setLineWidth(0.25);
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 28, 95, 28);

    // Transaction Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TRANSACTION RECEIPT', 10, 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Booking Ref: #${booking.id.toUpperCase().slice(0, 8)}`, 10, 40);

    let dateStr = 'N/A';
    if (booking.scheduledAt) {
      let d: Date;
      if (typeof booking.scheduledAt.toDate === 'function') {
        d = booking.scheduledAt.toDate();
      } else if (booking.scheduledAt.seconds) {
        d = new Date(booking.scheduledAt.seconds * 1000);
      } else {
        d = new Date(booking.scheduledAt);
      }
      dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else if (booking.createdAt) {
      let d: Date;
      if (typeof booking.createdAt.toDate === 'function') {
        d = booking.createdAt.toDate();
      } else if (booking.createdAt.seconds) {
        d = new Date(booking.createdAt.seconds * 1000);
      } else {
        d = new Date(booking.createdAt);
      }
      dateStr = d.toLocaleDateString() + ' (Walk-In)';
    }

    doc.text(`Date of Service: ${dateStr}`, 10, 45);
    doc.text(`Client Name: ${booking.userName || 'Valued Customer'}`, 10, 50);

    // Divider
    doc.line(10, 55, 95, 55);

    // Table Header row
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE', 10, 61);
    doc.text('QTY', 65, 61);
    doc.text('PRICE', 80, 61);

    // Table Header line
    doc.line(10, 64, 95, 64);

    // Table content row
    doc.setFont('helvetica', 'normal');
    const sName = booking.serviceName || 'Grooming Service';
    const truncatedName = sName.length > 22 ? sName.substring(0, 19) + '...' : sName;
    doc.text(truncatedName, 10, 70);
    doc.text('1', 67, 70);
    doc.text(`R${booking.totalPaid || 50}`, 80, 70);

    // Total divider line
    doc.setLineWidth(0.5);
    doc.line(10, 76, 95, 76);

    // Grand Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Grand Total:', 10, 83);
    doc.text(`R${booking.totalPaid || 50}`, 80, 83);

    // Barcode simulation lines
    doc.setLineWidth(0.4);
    for (let i = 0; i < 28; i++) {
      const xPos = 12 + i * 2.5;
      const stripeWidth = (i % 3 === 0) ? 0.8 : (i % 5 === 0 ? 1.2 : 0.4);
      doc.setLineWidth(stripeWidth);
      doc.line(xPos, 94, xPos, 110);
    }

    // Footer block
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Thank you for choosing Sizabantu Barbershop!', 52, 118, { align: 'center' });
    doc.text('Crafted for perfection. Est. 2022', 52, 122, { align: 'center' });

    doc.save(`Sizabantu_Receipt_${booking.id.slice(0, 5).toUpperCase()}.pdf`);
  } catch (e: any) {
    alert("Error generating PDF: " + e.message);
  }
};
