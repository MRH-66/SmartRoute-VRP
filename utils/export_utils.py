import pandas as pd
import io
from typing import Optional
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

from models.data_models import OptimizationResult, AppConfiguration

def export_results_to_csv(result: OptimizationResult) -> str:
    """
    Export optimization results to CSV format
    
    Args:
        result: OptimizationResult object
    
    Returns:
        CSV data as string
    """
    
    # Create route summary data
    route_data = []
    
    for route in result.routes:
        # Basic route info
        route_info = {
            'Vehicle_Name': route.vehicle_name,
            'Vehicle_Type': route.vehicle_type.value,
            'Total_Distance_km': round(route.total_distance_km, 2),
            'Total_Cost_PKR': round(route.total_cost, 2),
            'Number_of_Stops': len(route.stops),
            'Total_Workers': sum(stop.worker_count for stop in route.stops),
            'Utilization_Percent': round(route.utilization_percent, 1),
            'Route_Sequence': ' → '.join([stop.pickupspot_name for stop in route.stops])
        }
        route_data.append(route_info)
    
    # Create DataFrame
    df_routes = pd.DataFrame(route_data)
    
    # Create detailed stops data
    stops_data = []
    
    for route in result.routes:
        for stop in route.stops:
            stop_info = {
                'Vehicle_Name': route.vehicle_name,
                'Stop_Order': stop.arrival_order,
                'PickupSpot_Name': stop.pickupspot_name,
                'PickupSpot_ID': stop.pickupspot_id,
                'Workers_Count': stop.worker_count,
                'Latitude': stop.latitude,
                'Longitude': stop.longitude
            }
            stops_data.append(stop_info)
    
    df_stops = pd.DataFrame(stops_data)
    
    # Create summary data
    summary_data = {
        'Metric': [
            'Total Distance (km)',
            'Total Cost (PKR)',
            'Vehicles Used',
            'Total Vehicles Available',
            'Unassigned Pickup Spots'
        ],
        'Value': [
            round(result.total_distance, 2),
            round(result.total_cost, 2),
            result.total_vehicles_used,
            len(route_data) + (len(result.routes) if hasattr(result, 'total_vehicles_available') else 0),
            len(result.unassigned_pickupspots)
        ]
    }
    df_summary = pd.DataFrame(summary_data)
    
    # Combine all data into CSV
    output = io.StringIO()
    
    # Write timestamp
    output.write(f"# SmartRoute Optimization Results\n")
    output.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    output.write(f"\n")
    
    # Write summary
    output.write("# SUMMARY\n")
    df_summary.to_csv(output, index=False)
    output.write("\n")
    
    # Write routes
    output.write("# ROUTE SUMMARY\n")
    df_routes.to_csv(output, index=False)
    output.write("\n")
    
    # Write detailed stops
    output.write("# DETAILED STOPS\n")
    df_stops.to_csv(output, index=False)
    
    # Add unassigned pickup spots if any
    if result.unassigned_pickupspots:
        output.write("\n# UNASSIGNED PICKUP SPOTS\n")
        for pickupspot in result.unassigned_pickupspots:
            output.write(f"{pickupspot}\n")
    
    return output.getvalue()

def export_results_to_pdf(result: OptimizationResult, config: AppConfiguration) -> bytes:
    """
    Export optimization results to PDF format
    
    Args:
        result: OptimizationResult object
        config: AppConfiguration object
    
    Returns:
        PDF data as bytes
    """
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor('#1f77b4')
    )
    
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor('#333333')
    )
    
    # Title
    story.append(Paragraph("SmartRoute Optimization Report", title_style))
    story.append(Spacer(1, 12))
    
    # Timestamp
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Configuration Summary
    story.append(Paragraph("Configuration Summary", section_style))
    
    config_data = [
        ['Factory Location', config.factory.name if config.factory else 'Not set'],
        ['Factory Coordinates', f"{config.factory.latitude:.4f}, {config.factory.longitude:.4f}" if config.factory else 'N/A'],
        ['Total Vehicles', str(len(config.vehicles))],
        ['Total Pickup Spots', str(len(config.pickupspots))],
        ['Total Workers', str(sum(pickupspot.worker_count for pickupspot in config.pickupspots))]
    ]
    
    config_table = Table(config_data, colWidths=[2*inch, 3*inch])
    config_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(config_table)
    story.append(Spacer(1, 20))
    
    # Optimization Results Summary
    story.append(Paragraph("Optimization Results", section_style))
    
    results_data = [
        ['Metric', 'Value'],
        ['Total Distance', f"{result.total_distance:.1f} km"],
        ['Total Cost', f"{result.total_cost:.0f} PKR"],
        ['Vehicles Used', f"{result.total_vehicles_used}/{len(config.vehicles)}"],
        ['Unassigned Pickup Spots', str(len(result.unassigned_pickupspots))]
    ]
    
    results_table = Table(results_data, colWidths=[2*inch, 3*inch])
    results_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(results_table)
    story.append(Spacer(1, 20))
    
    # Vehicle Routes Details
    story.append(Paragraph("Vehicle Routes", section_style))
    
    for i, route in enumerate(result.routes):
        # Route header
        route_title = f"Route {i+1}: {route.vehicle_name} ({route.vehicle_type.value})"
        story.append(Paragraph(route_title, styles['Heading3']))
        
        # Route details
        route_details = [
            ['Distance', f"{route.total_distance_km:.1f} km"],
            ['Cost', f"{route.total_cost:.0f} PKR"],
            ['Utilization', f"{route.utilization_percent:.1f}%"],
            ['Workers', str(sum(stop.worker_count for stop in route.stops))]
        ]
        
        route_table = Table(route_details, colWidths=[1.5*inch, 2*inch])
        route_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey)
        ]))
        
        story.append(route_table)
        story.append(Spacer(1, 12))
        
        # Route sequence
        route_sequence = "Factory → " + " → ".join([stop.pickupspot_name for stop in route.stops]) + " → Factory"
        story.append(Paragraph(f"<b>Route:</b> {route_sequence}", styles['Normal']))
        
        # Detailed stops
        if route.stops:
            stops_data = [['Stop', 'Pickup Spot Name', 'Workers', 'Coordinates']]
            for stop in route.stops:
                stops_data.append([
                    str(stop.arrival_order),
                    stop.pickupspot_name,
                    str(stop.worker_count),
                    f"{stop.latitude:.4f}, {stop.longitude:.4f}"
                ])
            
            stops_table = Table(stops_data, colWidths=[0.7*inch, 2*inch, 0.8*inch, 2*inch])
            stops_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8)
            ]))
            
            story.append(stops_table)
        
        story.append(Spacer(1, 20))
    
    # Unassigned pickup spots warning
    if result.unassigned_pickupspots:
        story.append(Paragraph("Unassigned Pickup Spots", section_style))
        story.append(Paragraph("The following pickup spots could not be assigned to any vehicle:", styles['Normal']))
        
        for pickupspot in result.unassigned_pickupspots:
            story.append(Paragraph(f"• {pickupspot}", styles['Normal']))
        
        story.append(Spacer(1, 12))
        story.append(Paragraph("Consider adding more vehicles or increasing vehicle capacity.", styles['Italic']))
    
    # Footer
    story.append(Spacer(1, 30))
    story.append(Paragraph("Generated by SmartRoute - Employee Transport Optimizer", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return buffer.getvalue()

def create_route_summary_dataframe(result: OptimizationResult) -> pd.DataFrame:
    """Create a pandas DataFrame with route summary for easy analysis"""
    
    data = []
    
    for route in result.routes:
        row = {
            'Vehicle_Name': route.vehicle_name,
            'Vehicle_Type': route.vehicle_type.value,
            'Distance_km': route.total_distance_km,
            'Cost_PKR': route.total_cost,
            'Stops': len(route.stops),
            'Workers': sum(stop.worker_count for stop in route.stops),
            'Utilization_%': route.utilization_percent,
            'Route_Sequence': ' → '.join([stop.pickupspot_name for stop in route.stops])
        }
        data.append(row)
    
    return pd.DataFrame(data)

def export_for_drivers(result: OptimizationResult, config: AppConfiguration) -> str:
    """
    Export driver-specific instructions in simple text format
    
    Args:
        result: OptimizationResult object
        config: AppConfiguration object
    
    Returns:
        Driver instructions as string
    """
    
    output = []
    
    output.append("SMARTROUTE - DRIVER INSTRUCTIONS")
    output.append("=" * 50)
    output.append(f"Date: {datetime.now().strftime('%Y-%m-%d')}")
    output.append(f"Factory: {config.factory.name}")
    output.append("")
    
    for i, route in enumerate(result.routes, 1):
        output.append(f"VEHICLE {i}: {route.vehicle_name}")
        output.append("-" * 30)
        output.append(f"Total Distance: {route.total_distance_km:.1f} km")
        output.append(f"Total Workers: {sum(stop.worker_count for stop in route.stops)}")
        output.append("")
        
        output.append("PICKUP SEQUENCE:")
        output.append("1. START at Factory")
        
        for stop in route.stops:
            output.append(f"{stop.arrival_order + 1}. {stop.pickupspot_name} - Pick up {stop.worker_count} workers")
            output.append(f"   Location: {stop.latitude:.4f}, {stop.longitude:.4f}")
        
        output.append(f"{len(route.stops) + 2}. RETURN to Factory")
        output.append("")
        output.append("=" * 50)
        output.append("")
    
    return "\n".join(output)